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
     * @param  {Function} callback          Callback with error and crumb object
     */
    getCrumb(callback) {
        const options = {
            url: this.crumbUrl,
            method: 'GET'
        };

        request(options, (error, response) => {
            if (error) return callback(new Error(error.message));
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
     * @param  {Object}   crumb             CSRF token from jenkins api
     * @param  {Function} callback          Callback with error and jenkins client object
     */
    initJenkinsClient(crumb, callback) {
        const data = JSON.parse(crumb);

        const jenkinsClient = jenkins({
            baseUrl: this.baseUrl,
            headers: {
                [data.crumbRequestField]: data.crumb
            }
        });

        if (jenkinsClient) return callback(null, jenkinsClient);

        return callback(new Error('Failed to instantiate jenkins client'));
    }

    /**
     * Get build number of the job's last build
     * @method getBuildNumber
     * @param  jobName                      name of the jenkins job and also buildID in config
     * @param  {Function} callback          Callback with error, jenkins client object and build number
     */
    getBuildNumber(jobName, jenkinsClient, callback) {
        const get = jenkinsClient.job.get.bind(jenkinsClient.job);

        return get(jobName, (err, data) => {
            try {
                callback(err, jenkinsClient, data.lastBuild.number);
            } catch (e) {
                callback(e);
            }
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
     * @param  {Function} callback          Callback with null if successful otherwise error
     */
    _start(config, callback) {
        const fakeConfigPath = path.resolve(__dirname, './config/test-job.xml');
        const xml = fs.readFileSync(fakeConfigPath, 'utf-8');

        async.waterfall([
            this.getCrumb.bind(this),
            this.initJenkinsClient.bind(this),
            (jenkinsClient, cb) => {
                const create = jenkinsClient.job.create.bind(jenkinsClient.job);

                return create(config.buildId, xml, (err) => {
                    cb(err, jenkinsClient);
                });
            },
            (jenkinsClient, cb) => {
                const build = jenkinsClient.job.build.bind(jenkinsClient.job);

                return build(config.buildId, cb);
            }
        ], (error) => {
            if (error) return callback(new Error(error.message));

            return callback(null);
        });
    }

    /**
     * Stop the build
     * @method stop
     * @param  {Object}   config            A configuration object
     * @param  {String}   config.buildId    ID for the build and also name of the job in jenkins
     * @param  {Function} callback          Callback with null if successful otherwise error
     */
    _stop(config, callback) {
        async.waterfall([
            this.getCrumb.bind(this),
            this.initJenkinsClient.bind(this),
            (jenkinsClient, cb) => {
                return this.getBuildNumber(config.buildId, jenkinsClient, cb);
            },
            (jenkinsClient, buildNumber, cb) => {
                const stop = jenkinsClient.build.stop.bind(jenkinsClient.build);

                return stop(config.buildId, buildNumber, cb);
            }
        ], (error) => {
            if (error) return callback(new Error(error.message));

            return callback(null);
        });
    }

    /**
    * Streams logs
    * @method stream
    * @param  {Object}   config            A configuration object
    * @param  {String}   config.buildId    ID for the build
    * @param  {Response} callback          Callback with error and data
    */
    _stream(config, callback) {
        async.waterfall([
            this.getCrumb.bind(this),
            this.initJenkinsClient.bind(this),
            (jenkinsClient, cb) => {
                return this.getBuildNumber(config.buildId, jenkinsClient, cb);
            },
            (jenkinsClient, buildNumber, cb) => {
                const log = jenkinsClient.build.log.bind(jenkinsClient.build);

                return log(config.buildId, buildNumber, cb);
            }
        ], (error, log) => {
            if (error) return callback(new Error(error.message));

            return callback(null, log);
        });
    }
}

module.exports = J5sExecutor;
