'use strict';
const Executor = require('screwdriver-executor-base');
const path = require('path');
const request = require('request');
const jenkins = require('jenkins');
const fs = require('fs');
const async = require('async');

class J5sExecutor extends Executor {

    /**
     * Constructor
     * @method constructor
     * @param  {Object} options           Configuration options
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
        this.baseUrl = `http://${this.username}:${this.password}@${this.host}:8080`;
        this.crumbUrl = this.baseUrl.concat('/crumbIssuer/api/json');
    }

    /**
     * Get CSRF token crumb for Jenkins
     * @method getCrumb
     * @param  {Function} callback          fn(err, crumb) where crumb is an object
     */
    getCrumb(callback) {
        const options = {
            uri: this.crumbUrl,
            method: 'GET'
        };

        request(options, (error, response) => {
            if (error) {
                return callback(error);
            }

            if (response.statusCode !== 200) {
                const msg = `${response.statusCode}
                Failed to get crumb: ${JSON.stringify(response.body)}`;

                return callback(new Error(msg));
            }

            return callback(null, response.body);
        });
    }

    /**
     * Initialize the jenkins client with crumb
     * @method initJenkinsClient
     * @param  {Object} crumb               CSRF token from jenkins api
     * @param  {Function} callback          fn(err, jenkinsClient) where jenkinsClient is an object
     */
    initJenkinsClient(crumb, callback) {
        const data = JSON.parse(crumb);

        const jenkinsClient = jenkins({
            baseUrl: this.baseUrl,
            headers: {
                [data.crumbRequestField]: data.crumb
            }
        });

        return callback(null, jenkinsClient);
    }

    /**
     * Get build number of the job's last build
     * @method getBuildNumber
     * @param  {String} jobName             Name of the jenkins job and also buildID in config
     * @param  {Function} callback          fn(err, jenkinsClient, buidldNumber) where jenkinsClient is an object and buildNumber is number
     */
    getBuildNumber(jobName, jenkinsClient, callback) {
        const get = jenkinsClient.job.get.bind(jenkinsClient.job);

        return get(jobName, (err, data) => {
            if (err) {
                return callback(err);
            }

            if (!(data && data.lastBuild && data.lastBuild.number)) {
                return callback(new Error('No build has been started yet, try later'));
            }

            return callback(null, jenkinsClient, data.lastBuild.number);
        });
    }

    /**
     * Create a jenkins job and start the build
     * @method _start
     * @param  {Object}   config            A configuration object
     * @param  {String}   config.buildId    ID for the build and also name of the job in jenkins
     * @param  {String}   config.jobId      ID for the job
     * @param  {String}   config.pipelineId ID for the pipeline
     * @param  {String}   config.container  Container for the build to run in
     * @param  {String}   config.scmUrl     Scm URL to use in the build
     * @param  {Function} callback          fn(err)
     */
    _start(config, callback) {
        let xml;

        async.waterfall([
            (next) => {
                const configPath = path.resolve(__dirname, './config/test-job.xml');

                fs.readFile(configPath, 'utf-8', (err, fileContents) => {
                    xml = fileContents;
                    next(err);
                });
            },
            this.getCrumb.bind(this),
            this.initJenkinsClient.bind(this),
            (jenkinsClient, cb) => {
                jenkinsClient.job.create(config.buildId, xml, (err) => {
                    cb(err, jenkinsClient);
                });
            },
            (jenkinsClient, cb) => jenkinsClient.job.build(config.buildId, cb)
        ], callback);
    }

    /**
     * Stop the build
     * @method stop
     * @param  {Object}   config            A configuration object
     * @param  {String}   config.buildId    ID for the build and also name of the job in jenkins
     * @param  {Function} callback          fn(err)
     */
    _stop(config, callback) {
        async.waterfall([
            this.getCrumb.bind(this),
            this.initJenkinsClient.bind(this),
            (jenkinsClient, cb) => this.getBuildNumber(config.buildId, jenkinsClient, cb),
            (jenkinsClient, buildNumber, cb) =>
            jenkinsClient.build.stop(config.buildId, buildNumber, cb)
        ], callback);
    }

    /**
    * Streams logs
    * @method stream
    * @param  {Object}   config            A configuration object
    * @param  {String}   config.buildId    ID for the build
    * @param  {Response} callback          fn(err, log) where log is string
    */
    _stream(config, callback) {
        async.waterfall([
            this.getCrumb.bind(this),
            this.initJenkinsClient.bind(this),
            (jenkinsClient, cb) => this.getBuildNumber(config.buildId, jenkinsClient, cb),
            (jenkinsClient, buildNumber, cb) =>
            jenkinsClient.build.log(config.buildId, buildNumber, cb)
        ], callback);
    }
}

module.exports = J5sExecutor;
