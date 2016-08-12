'use strict';
const Executor = require('screwdriver-executor-base');
const path = require('path');
const jenkins = require('jenkins');
const fs = require('fs');
const async = require('async');
const Breaker = require('circuit-fuses');

class J5sExecutor extends Executor {

    /**
     * JenkinsClient command to run
     * @method _jenkinsCommand
     * @param  {Object}   options            An object that tells what command & params to run
     * @param  {String}   options.module     Jenkins client module. For example: job, build
     * @param  {String}   options.action     Jenkins client action in the given module. For example: get, create
     * @param  {Array}    options.params     Parameters to run with
     * @param  {Function} callback           fn(err) from jenkinsClient
     */
    _jenkinsCommand(options, callback) {
        // To pass arguments as an array, we need to use apply
        options.params.push(callback);

        return this.jenkinsClient[options.module][options.action].apply(
            this.jenkinsClient[options.module],
            options.params);
    }

    /**
     * Constructor
     * @method constructor
     * @param  {Object} options           Configuration options
     * @param  {String} options.host      Jenkins hostname to make requests to
     * @param  {String} options.username  Jenkins username
     * @param  {String} options.password  Jenkins password/token
     */
    constructor(options) {
        super();
        this.host = options.host;
        this.username = options.username;
        this.password = options.password;
        // need to pass port number in the future
        this.baseUrl = `http://${this.username}:${this.password}@${this.host}:8080`;
        this.jenkinsClient = jenkins({
            baseUrl: this.baseUrl,
            crumbIssuer: true
        });

        // eslint-disable-next-line no-underscore-dangle
        this.breaker = new Breaker(this._jenkinsCommand.bind(this));
    }

    /**
     * Create a jenkins job and start the build
     * @method _start
     * @param  {Object}   config            A configuration object
     * @param  {String}   config.buildId    ID for the build and also name of the job in jenkins
     * @param  {String}   config.container  Container for the build to run in
     * @param  {String}   config.apiUri     Screwdriver's API
     * @param  {String}   config.token      JWT to act on behalf of the build
     * @param  {Function} callback          fn(err)
     */
    _start(config, callback) {
        const jobName = config.buildId;
        let xml;

        async.series([
            (next) => {
                const configPath = path.resolve(__dirname, './config/test-job.xml');

                fs.readFile(configPath, 'utf-8', (err, fileContents) => {
                    xml = fileContents;
                    next(err);
                });
            },
            (next) => this.breaker.runCommand({
                module: 'job',
                action: 'create',
                params: [jobName, xml]
            }, next),
            (next) => this.breaker.runCommand({
                module: 'job',
                action: 'build',
                params: [jobName]
            }, next)
        ], callback);
    }

    /**
     * Stop the build
     * @method _stop
     * @param  {Object}   config            A configuration object
     * @param  {String}   config.buildId    ID for the build and also name of the job in jenkins
     * @param  {Function} callback          fn(err)
     */
    _stop(config, callback) {
        const jobName = config.buildId;

        async.waterfall([
            (next) => this.breaker.runCommand({
                module: 'job',
                action: 'get',
                params: [jobName]
            }, next),
            (data, next) => {
                if (!(data && data.lastBuild && data.lastBuild.number)) {
                    return next(new Error('No build has been started yet, try later'));
                }

                return this.breaker.runCommand({
                    module: 'build',
                    action: 'stop',
                    params: [jobName, data.lastBuild.number]
                }, next);
            }
        ], callback);
    }
}

module.exports = J5sExecutor;
