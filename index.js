'use strict';

const Executor = require('screwdriver-executor-base');
const path = require('path');
const jenkins = require('jenkins');
const fs = require('fs');
const xmlescape = require('xml-escape');
const shellescape = require('shell-escape');
const _ = require('lodash');
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
        this.jenkinsClient[options.module][options.action].apply(
            this.jenkinsClient[options.module],
            options.params.concat([callback]));
    }

    /**
     * Create or update Jenkins job
     * @method _jenkinsJobCreateOrUpdate
     * @param  {String}   jobName            Jenkins job name
     * @param  {String}   xml                Jenkins job configuration
     * @return {Promise}
     */
    _jenkinsJobCreateOrUpdate(jobName, xml) {
        return Promise.resolve().then(() =>
            this.breaker.runCommand({
                module: 'job',
                action: 'exists',
                params: [{ name: jobName }]
            })
        ).then((exists) => {
            if (exists) {
                return this.breaker.runCommand({
                    module: 'job',
                    action: 'config',
                    params: [{ name: jobName, xml }]
                });
            }

            return this.breaker.runCommand({
                module: 'job',
                action: 'create',
                params: [{ name: jobName, xml }]
            });
        });
    }

    /**
     * Stop Jenkins job
     * @method _jenkinsJobStop
     * @param  {String}   jobName            Jenkins job name
     * @return {Promise}
     */
    _jenkinsJobStop(jobName) {
        return this.breaker.runCommand({
            module: 'job',
            action: 'get',
            params: [{ name: jobName }]
        }).then((data) => {
            if (!(data && data.lastBuild && data.lastBuild.number)) {
                throw new Error('No build has been started yet, try later');
            }

            return this.breaker.runCommand({
                module: 'build',
                action: 'stop',
                params: [{ name: jobName, number: data.lastBuild.number }]
            });
        }).then(() => this._jenkinsJobWaitStop(jobName, 0));
    }

    /**
     * Wait until the job has stopped
     * @method _jenkinsJobWaitStop
     * @param  {String}   jobName            Jenkins job name
     * @param  {Number}   timeConsumed       Elapsed time
     * @return {Promise}
     */
    _jenkinsJobWaitStop(jobName, timeConsumed) {
        if (timeConsumed >= this.cleanupTimeLimit) {
            return Promise.resolve();
        }

        return this.breaker.runCommand({
            module: 'job',
            action: 'get',
            params: [{ name: jobName }]
        }).then((data) => {
            if (data && data.lastCompletedBuild && data.lastCompletedBuild.number) {
                return null;
            }

            // delay between retry attempts
            return new Promise((resolve) => {
                setTimeout(() => resolve(), this.cleanupWatchInterval * 1000);
            }).then(() =>
                this._jenkinsJobWaitStop(jobName, timeConsumed + this.cleanupWatchInterval)
            );
        });
    }

    /**
     * Jenkins job config xml
     * @method _loadJobXml
     * @param  {Object}   config        A configuration object psssed to _start
     * @return {Promise}
     */
    _loadJobXml(config) {
        const { buildScript, cleanupScript } = this._taskScript(config);

        return new Promise((resolve, reject) => {
            const configPath = path.resolve(__dirname, './config/job.xml');

            fs.readFile(configPath, 'utf-8', (err, fileContents) => {
                if (err) {
                    return reject(err);
                }

                return resolve(fileContents);
            });
        }).then(xml => (
            _.template(xml)({
                nodeLabel: xmlescape(this.nodeLabel),
                buildScript: xmlescape(buildScript),
                cleanupScript: xmlescape(cleanupScript)
            })
        ));
    }

    /**
     * Script for job
     * @method _taskScript
     * @param  {Object}   config        A configuration object psssed to _start
     * @return {Object}
     */
    _taskScript(config) {
        if (this.buildScript && this.cleanupScript) {
            return {
                buildScript: this.buildScript,
                cleanupScript: this.cleanupScript
            };
        }

        return this._dockerTaskScript(config);
    }

    /**
     * Script for job using docker
     * @method _dockerTaskScript
     * @param  {Object}   config        A configuration object psssed to _start
     * @return {Object}
     */
    _dockerTaskScript(config) {
        const pullLauncherImage = shellescape([
            this.dockerCommand, 'pull', `screwdrivercd/launcher:${this.launchVersion}`
        ]);
        const pullBuildImage = shellescape([
            this.dockerCommand, 'pull', config.container
        ]);
        const launcherContainerName = `${this.prefix}${config.buildId}-init`;
        const createLauncherContainer = shellescape([
            this.dockerCommand, 'run',
            '--name', launcherContainerName,
            '--label', `sdbuild=${this.prefix}${config.buildId}`,
            '--entrypoint', '/bin/true',
            `screwdrivercd/launcher:${this.launchVersion}`
        ]);
        const buildContainerName = `${this.prefix}${config.buildId}-build`;
        const createBuildContainer = shellescape([
            this.dockerCommand, 'run',
            '--name', buildContainerName,
            '--label', `sdbuild=${this.prefix}${config.buildId}`,
            '--entrypoint', '/opt/sd/tini',
            '--memory', this.memory,
            '--memory-swap', this.memoryLimit,
            '--volumes-from', `${launcherContainerName}:rw`,
            '-e', 'SD_TOKEN',
            config.container,
            '--',
            // Run a shell command
            '/bin/sh',
            '-c',
            [
                // Run the launcher in the background
                '/opt/sd/launch',
                '--api-uri',
                this.ecosystem.api,
                '--emitter',
                '/opt/sd/emitter',
                config.buildId,
                '&',
                // Run the logservice in the background
                '/opt/sd/logservice',
                '--emitter',
                '/opt/sd/emitter',
                '--api-uri',
                this.ecosystem.store,
                '--build',
                config.buildId,
                '&',
                // Wait for both background jobs to complete
                'wait $(jobs -p)'
            ].join(' ')
        ]);

        const waitContainerEnd = shellescape([
            this.dockerCommand, 'wait', buildContainerName
        ]);

        const buildScript = `
set -eu

${pullLauncherImage} &
${pullBuildImage} &

wait $(jobs -p)

${createLauncherContainer}
${createBuildContainer}

${waitContainerEnd}
`;

        const stopContainer = shellescape([
            this.dockerCommand, 'rm',
            '-v', '-f',
            buildContainerName,
            launcherContainerName
        ]);

        const cleanupScript = `
${stopContainer}
`;

        return { buildScript, cleanupScript };
    }

    /**
     * Jenkins job name
     * @method _jobName
     * @param  {String}   buildId     ID for the build
     * @return {String}               Jenkins job name
     */
    _jobName(buildId) {
        return `SD-${buildId}`;
    }

    /**
     * Constructor
     * @method constructor
     * @param  {Object} options           Configuration options
     * @param  {Object} options.ecosystem                              Screwdriver Ecosystem
     * @param  {Object} options.ecosystem.api                          Routable URI to Screwdriver API
     * @param  {Object} options.ecosystem.store                        Routable URI to Screwdriver Store
     * @param  {String} options.jenkins.host                           Jenkins hostname to make requests to
     * @param  {Number} [options.jenkins.port=8080]                    Jenkins port to make requests to
     * @param  {String} [options.jenkins.username='screwdriver']       Jenkins username
     * @param  {String} options.jenkins.password                       Jenkins password/token
     * @param  {String} [options.jenkins.nodeLabel='screwdriver']      Node labels of Jenkins slaves
     * @param  {String} [options.docker.command='docker']              THe path to the docker command
     * @param  {String} [options.docker.launchVersion='stable']        Launcher container version to use
     * @param  {String} [options.docker.prefix='']                     Prefix to all container names
     * @param  {String} [options.docker.memory='4g']                   Memory limit (docker run `--memory` option)
     * @param  {String} [options.docker.memoryLimit='6g']              Memory limit include swap (docker run `--memory-swap` option)
     * @param  {String} [options.buildScript]                          Shell script to start the job
     * @param  {String} [options.cleanupScript='']                     Shell script to clean up the job
     * @param  {Number} [options.cleanupTimeLimit=20]                  Time to destory the job(seconds)
     * @param  {Number} [options.cleanupWatchInterval=2]               Interval to detect the stopped job (seconds)
     * @param  {String} [options.fusebox]                              Options for the circuit breaker (https://github.com/screwdriver-cd/circuit-fuses)
     */
    constructor(options) {
        super();
        this.ecosystem = options.ecosystem;
        this.host = options.jenkins.host;
        this.port = options.jenkins.port || '8080';
        this.username = options.jenkins.username || 'screwdriver';
        this.password = options.jenkins.password;
        this.nodeLabel = options.jenkins.nodeLabel || 'screwdriver';
        this.dockerCommand = (options.docker && options.docker.command) || 'docker';
        this.launchVersion = (options.docker && options.docker.launchVersion) || 'stable';
        this.prefix = (options.docker && options.docker.prefix) || '';
        this.memory = (options.docker && options.docker.memory) || '4g';
        this.memoryLimit = (options.docker && options.docker.memoryLimit) || '6g';

        this.buildScript = options.buildScript;
        this.cleanupScript = options.cleanupScript || '';
        this.cleanupTimeLimit = options.cleanupTimeLimit || 20;
        this.cleanupWatchInterval = options.cleanupWatchInterval || 2;

        // need to pass port number in the future
        this.baseUrl = `http://${this.username}:${this.password}@${this.host}:${this.port}`;
        this.jenkinsClient = jenkins({
            baseUrl: this.baseUrl,
            crumbIssuer: true
        });

        // eslint-disable-next-line no-underscore-dangle
        this.breaker = new Breaker(this._jenkinsCommand.bind(this), options.fusebox);
    }

    /**
     * Create a jenkins job and start the build
     * @method _start
     * @param  {Object}   config            A configuration object
     * @param  {String}   config.buildId    ID for the build and also name of the job in jenkins
     * @param  {String}   config.container  Container for the build to run in
     * @param  {String}   config.token      JWT to act on behalf of the build
     * @return {Promise}
     */
    _start(config) {
        const jobName = this._jobName(config.buildId);

        return this._loadJobXml(config).then(xml =>
            this._jenkinsJobCreateOrUpdate(jobName, xml)
        ).then(() => {
            const parameters = {
                SD_BUILD_ID: String(config.buildId),
                SD_TOKEN: config.token,
                SD_CONTAINER: config.container,
                SD_API: this.ecosystem.api,
                SD_STORE: this.ecosystem.store
            };

            return this.breaker.runCommand({
                module: 'job',
                action: 'build',
                params: [{ name: jobName, parameters }]
            });
        });
    }

    /**
     * Stop the build
     * @method _stop
     * @param  {Object}   config            A configuration object
     * @param  {String}   config.buildId    ID for the build
     * @return {Promise}
     */
    _stop(config) {
        const jobName = this._jobName(config.buildId);

        return this._jenkinsJobStop(
            jobName
        ).then(() => this.breaker.runCommand({
            module: 'job',
            action: 'destroy',
            params: [{ name: jobName }]
        }));
    }
}

module.exports = J5sExecutor;
