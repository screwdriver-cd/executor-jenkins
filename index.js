'use strict';
const Executor = require('screwdriver-executor-base');
const path = require('path');
const Readable = require('stream').Readable;
// const Fusebox = require('circuit-fuses');
const request = require('request');
const tinytim = require('tinytim');
const yaml = require('js-yaml');
const hoek = require('hoek');
const jenkins = require('jenkins');
const fs = require('fs');
const async = require('async');
const SCM_URL_REGEX = /^git@([^:]+):([^\/]+)\/(.+?)\.git(#.+)?$/;
const GIT_ORG = 2;
const GIT_REPO = 3;
const GIT_BRANCH = 4;

class J5sExecutor extends Executor {

    /**
     * Constructor
     * @method constructor
     * @param  {Object} options           Configuration options
     * @param  {Object} options.token     Api Token to make requests with
     * @param  {Object} options.host      Jenkins hostname to make requests to
     * @param  {Object} options.username  Jenkins username
     * @param  {Object} options.password  Jenkins password/token
     */
    constructor(options) {
        super();
        this.host = options.host;
        this.username = options.username;
        this.password = options.password;
        // need to pass port nubmer in the future
        this.crumbUrl =
    `https://${this.username}:${this.password}@${this.host}:8080/crumbIssuer/api/json`;
    }

    /**
     * Get CSRF token crumb for Jenkins
     * @method getCrumb
     * @param  {Function} callback          Callback with crumb object
     */
    getCrumb(callback) {
        const options = {
            url: this.crumbUrl,
            method: 'GET'
        };

        request(options, (error, response) => {
            if (error) return callback(new Error(error));

            if (response.statusCode !== 200) {
                const msg = `Failed to get crumb: ${JSON.stringify(response.body)}`;

                return callback(new Error(msg));
            }

            return callback(null, response.body);
        });
    }

    /**
     * Initialize the jenkins client with crumb
     * @method initJenkinsClient
     * @param  crumb                        CSRF token from jenkins api
     * @param  {Function} callback          Callback with jenkins client object
     */
    initJenkinsClient(crumb, callback) {
        const jenkinsClient = jenkins({
            baseUrl: `http://${this.username}:${this.password}@${this.host}:8080`,
            headers: {
                [crumb.crumbRequestField]: crumb.crumb
            }
        });

        return callback(null, jenkinsClient);
    }

    /**
     * Read config file from configPath and create a jenkins job with jobName
     * @method readConfigAndCreateJob
     * @param  jenkinsClient                jenkinsClient object
     * @param  jobName                      Name of the new jenkins job
     * @param  configPath                   Path of the config xml file
     * @param  {Function} callback          Callback with null if sucessful otherwise error
     */
    readConfigAndCreateJob(jenkinsClient, jobName, configPath, callback) {
        const xml = fs.readFileSync(configPath, 'utf-8');

        jenkinsClient.job.create(jobName, xml, (errors, response) => {
            if (errors) return callback(new Error(errors));

            if (response.statusCode !== 200) {
                const msg = `Failed to create job: ${response.statusCode}`
                 + `: ${JSON.stringify(response.body)}`;

                return callback(new Error(msg));
            }

            return callback(null);
        });
    }

    /**
     * Create a jenkins job
     * @method createJob
     * @param  {Function} callback          Callback with null if successful otherwise error
     */
    createJob(callback) {
        const fakeJobName = 'Hello';
        const fakeConfigPath = path.resolve(__dirname, './config/test-job.xml');

        async.waterfall([
            this.getCrumb,
            this.initJenkinsClient,
            /* eslint-disable arrow-body-style */
            (jenkinsClient, cb) => {
                return this.readConfigAndCreateJob(jenkinsClient, fakeJobName, fakeConfigPath, cb);
            }
        ], (error) => {
            if (error) return callback(error);

            return callback(null);
        });
    }

    /**
     * Create Jenkins Job & Starts a build
     * @method start
     * @param  {Object}   config            A configuration object

     * @param  {String}   config.buildId    ID for the build
     * @param  {String}   config.jobId      ID for the job
     * @param  {String}   config.pipelineId ID for the pipeline
     * @param  {String}   config.container  Container for the build to run in
     * @param  {String}   config.scmUrl     Scm URL to use in the build
     * @param  {Function} callback          Callback function
     */
    _start(config, callback) {
        const scmMatch = SCM_URL_REGEX.exec(config.scmUrl);
        const jobTemplate = tinytim.renderFile(path.resolve(__dirname, './config/job.yaml.tim'), {
            git_org: scmMatch[GIT_ORG],
            git_repo: scmMatch[GIT_REPO],
            git_branch: (scmMatch[GIT_BRANCH] || '#master').slice(1),
            job_name: 'main',
            build_id: config.buildId,
            job_id: config.jobId,
            pipeline_id: config.pipelineId
        });

        const options = {
            uri: this.jobsUrl,
            method: 'POST',
            json: yaml.safeLoad(jobTemplate),
            headers: {
                Authorization: `Bearer ${this.token}`
            },
            strictSSL: false
        };

        this.breaker.runCommand(options, (err, resp) => {
            if (err) {
                return callback(err);
            }

            if (resp.statusCode !== 201) {
                const msg = `Failed to create job: ${JSON.stringify(resp.body)}`;

                return callback(new Error(msg));
            }

            return callback(null);
        });
    }

    /**
    * Streams logs
    * @method stream
    * @param  {Object}   config            A configuration object
    * @param  {String}   config.buildId    ID for the build
    * @param  {Response} callback          Callback for when a stream is created
    */
    _stream(config, callback) {
        const pod = `${this.podsUrl}?labelSelector=sdbuild=${config.buildId}`;
        const options = {
            url: pod,
            headers: {
                Authorization: `Bearer ${this.token}`
            },
            json: true,
            strictSSL: false
        };

        this.breaker.runCommand(options, (err, resp) => {
            if (err) {
                return callback(new Error(`Error getting pod with sdbuild=${config.buildId}`));
            }

            const body = resp.body;
            const podName = hoek.reach(body, 'items.0.metadata.name');

            if (!podName) {
                return callback(new Error(`Error getting pod name: ${JSON.stringify(body)}`));
            }
            const logUrl = `${this.podsUrl}/${podName}/log?container=build&follow=true&pretty=true`;

            return callback(null, new Readable().wrap(request.get({
                url: logUrl,
                headers: {
                    Authorization: `Bearer ${this.token}`
                },
                strictSSL: false
            })));
        });
    }
}

module.exports = J5sExecutor;
