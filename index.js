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
     * @param  {Object} options.host      Jenkins hostname to make requests to
     * @param  {Object} options.username  Jenkins username
     * @param  {Object} options.password  Jenkins password/token
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
     * @param  {Function} callback          fn(err) where data is always null
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
}

module.exports = J5sExecutor;
