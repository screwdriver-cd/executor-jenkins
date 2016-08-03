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
        this.crumbUrl =
    `http://${this.username}:${this.password}@${this.host}:8080/crumbIssuer/api/json`;
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
     * @param  {Function} callback          Callback with error and jenkins client object
     */
    initJenkinsClient(crumb, callback) {
        const data = JSON.parse(crumb);

        const jenkinsClient = jenkins({
            baseUrl: `http://${this.username}:${this.password}@${this.host}:8080`,
            headers: {
                [data.crumbRequestField]: data.crumb
            }
        });

        return callback(null, jenkinsClient);
    }

    /**
     * Read xml config file from configPath, create a jenkins job with jobName and start the build
     * @method readConfigAndCreateJob
     * @param  jenkinsClient                jenkinsClient object
     * @param  jobName                      Name of the new jenkins job
     * @param  configPath                   Path of the config xml file
     * @param  {Function} callback          Callback with null if successful otherwise error
     */
    readConfigAndCreateJob(jenkinsClient, jobName, configPath, callback) {
        const xml = fs.readFileSync(configPath, 'utf-8');
        const create = jenkinsClient.job.create.bind(jenkinsClient.job);
        const build = jenkinsClient.job.build.bind(jenkinsClient.job);

        async.waterfall([
            async.apply(create, jobName, xml),
            async.apply(build, jobName)
        ], (err) => {
            if (err) return callback(new Error(err.message));

            return callback(null);
        });
    }

    /**
     * Get last build of the job with the given name and stop it
     * @method stopCurrentBuild
     * @param  jenkinsClient                jenkinsClient object
     * @param  jobName                      Name of the new jenkins job
     * @param  {Function} callback          Callback with null if successful otherwise error
     */
    stopCurrentBuild(jenkinsClient, jobName, callback) {
        const get = jenkinsClient.job.get.bind(jenkinsClient.job);
        const stop = jenkinsClient.build.stop.bind(jenkinsClient.build);

        async.waterfall([
            async.apply(get, jobName),
            (data, cb) => {
                try {
                    cb(null, data.lastBuild.number);
                } catch (e) {
                    cb(e);
                }
            },
            async.apply(stop, jobName)
        ], (err) => {
            if (err) return callback(err);

            return callback(null);
        });
    }

    /**
     * Get last build of the job with the given name and get the log of it
     * @method getBuildLog
     * @param  jenkinsClient                jenkinsClient object
     * @param  jobName                      Name of the new jenkins job
     * @param  {Function} callback          Callback with error and data
     */
    getBuildLog(jenkinsClient, jobName, callback) {
        const get = jenkinsClient.job.get.bind(jenkinsClient.job);
        const log = jenkinsClient.build.log.bind(jenkinsClient.build);

        async.waterfall([
            async.apply(get, jobName),
            (data, cb) => {
                try {
                    cb(null, data.lastBuild.number);
                } catch (e) {
                    cb(e);
                }
            },
            async.apply(log, jobName)
        ], (err, data) => {
            if (err) return callback(err);

            return callback(null, data);
        });
    }

    /**
     * Create a jenkins job and start the build
     * @method createJob
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

        async.waterfall([
            this.getCrumb.bind(this),
            this.initJenkinsClient.bind(this),
            /* eslint-disable arrow-body-style */
            (jenkinsClient, cb) => {
                return this.readConfigAndCreateJob(jenkinsClient,
                    config.buildId, fakeConfigPath, cb);
            }
        ], (error) => {
            if (error) return callback(error);

            return callback(null);
        });
    }

    /**
     * Stop the build
     * @method createJob
     * @param  {Object}   config            A configuration object
     * @param  {String}   config.buildId    ID for the build and also name of the job in jenkins
     * @param  {Function} callback          Callback with null if successful otherwise error
     */
    _stop(config, callback) {
        async.waterfall([
            this.getCrumb.bind(this),
            this.initJenkinsClient.bind(this),
            /* eslint-disable arrow-body-style */
            (jenkinsClient, cb) => {
                return this.stopCurrentBuild(jenkinsClient,
                    config.buildId, cb);
            }
        ], (error) => {
            if (error) return callback(error);

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
            /* eslint-disable arrow-body-style */
            (jenkinsClient, cb) => {
                return this.getBuildLog(jenkinsClient,
                    config.buildId, cb);
            }
        ], (error, log) => {
            if (error) return callback(error);

            return callback(null, log);
        });
    }
}

module.exports = J5sExecutor;
