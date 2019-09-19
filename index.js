'use strict';

const Executor = require('screwdriver-executor-base');
const path = require('path');
const jenkins = require('jenkins');
const xmlescape = require('xml-escape');
const tinytim = require('tinytim');
const Breaker = require('circuit-fuses').breaker;
const hoek = require('hoek');

const password = Symbol('password');
const baseUrl = Symbol('baseUrl');

const ANNOTATE_BUILD_TIMEOUT = 'timeout';
const ANNOTATE_BUILD_NODE_LABEL = 'nodeLabel';

class JenkinsExecutor extends Executor {
    /**
     * JenkinsClient command to run
     * @method _jenkinsCommand
     * @param  {Object}   options            An object that tells what command & params to run
     * @param  {String}   options.module     Jenkins client module. For example: job, build
     * @param  {String}   options.action     Jenkins client action in the given module. For example: get, create
     * @param  {Array}    options.params     Parameters to run with
     * @param  {Function} callback           fn(err) from jenkinsClient
     * @private
     */
    _jenkinsCommand(options, callback) {
        // To pass arguments as an array, we need to use apply
        this.jenkinsClient[options.module][options.action].apply(
            this.jenkinsClient[options.module],
            options.params.concat([callback])
        );
    }

    /**
     * Create or update Jenkins job
     * @async  _jenkinsJobCreateOrUpdate
     * @param  {String}   jobName            Jenkins job name
     * @param  {String}   xml                Jenkins job configuration
     * @return {Promise}
     * @private
     */
    async _jenkinsJobCreateOrUpdate(jobName, xml) {
        const jobExists = await this.breaker.runCommand({
            module: 'job',
            action: 'exists',
            params: [{ name: jobName }]
        });
        const action = jobExists ? 'config' : 'create';

        return this.breaker.runCommand({
            module: 'job',
            action,
            params: [{ name: jobName, xml }]
        });
    }

    /**
     * Stop Jenkins job
     * @async  _jenkinsJobStop
     * @param  {String}   jobName            Jenkins job name
     * @return {Promise}
     * @private
     */
    async _jenkinsJobStop(jobName) {
        const job = await this.breaker.runCommand({
            module: 'job',
            action: 'get',
            params: [{ name: jobName }]
        });

        if (!(job && job.lastBuild && job.lastBuild.number)) {
            throw new Error('No build has been started yet, try later');
        }

        await this.breaker.runCommand({
            module: 'build',
            action: 'stop',
            params: [{ name: jobName, number: job.lastBuild.number }]
        });

        return this._jenkinsJobWaitStop(jobName, 0);
    }

    /**
     * Wait until the job has stopped
     * @async  _jenkinsJobWaitStop
     * @param  {String}   jobName            Jenkins job name
     * @param  {Number}   timeConsumed       Elapsed time (seconds)
     * @return {Promise}
     * @private
     */
    async _jenkinsJobWaitStop(jobName, timeConsumed) {
        if (timeConsumed >= this.cleanupTimeLimit) {
            throw new Error('Clean up timeout exceeded');
        }

        const job = await this.breaker.runCommand({
            module: 'job',
            action: 'get',
            params: [{ name: jobName }]
        });

        if (job && job.lastCompletedBuild && job.lastCompletedBuild.number) {
            return null;
        }

        // delay between retry attempts
        return new Promise((resolve) => {
            setTimeout(resolve, this.cleanupWatchInterval * 1000);
        }).then(() => this._jenkinsJobWaitStop(jobName, timeConsumed + this.cleanupWatchInterval));
    }

    /**
     * Jenkins job config xml
     * @method _loadJobXml
     * @param  {Object}   config        A configuration object psssed to _start
     * @param  {Object}   annotations   Annotations passed to _start
     * @return {String}
     * @private
     */
    _loadJobXml(config, annotations) {
        const { buildScript, cleanupScript } = this._taskScript(config);
        const nodeLabel = annotations[ANNOTATE_BUILD_NODE_LABEL]
            ? `${this.nodeLabel}-${annotations[ANNOTATE_BUILD_NODE_LABEL]}` : this.nodeLabel;

        const variables = {
            nodeLabel: xmlescape(nodeLabel),
            buildScript: xmlescape(buildScript),
            cleanupScript: xmlescape(cleanupScript)
        };

        return tinytim.renderFile(path.resolve(__dirname, './config/job.xml.tim'),
            variables);
    }

    /**
     * Script for job
     * @method _taskScript
     * @param  {Object}   config        A configuration object psssed to _start
     * @return {Object}
     * @private
     */
    _taskScript(config) {
        if (this.buildScript.length !== 0) {
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
     * @private
     */
    _dockerTaskScript(config) {
        const variables = {
            launcher_version: this.launchVersion,
            build_id: config.buildId,
            build_id_with_prefix: `${this.prefix}${config.buildId}`,
            token: config.token,
            base_image: config.container,
            memory: this.memory,
            memory_swap: this.memoryLimit,
            api_uri: this.ecosystem.api,
            store_uri: this.ecosystem.store,
            ui_uri: this.ecosystem.ui
        };

        const templateFile = path.resolve(__dirname, './config/docker-compose.yml.tim');
        const composeYml = tinytim.renderFile(templateFile, variables);

        const buildScript = [
            'set -eu',
            "cat << 'EOL' > docker-compose.yml",
            composeYml,
            'EOL',
            '',
            `${this.composeCommand} pull`,
            `${this.composeCommand} up`
        ].join('\n');

        const cleanupScript = [
            `${this.composeCommand} rm -f -s`,
            'rm -f docker-compose.yml'
        ].join('\n');

        return { buildScript, cleanupScript };
    }

    /**
     * Jenkins job name
     * @method _jobName
     * @param  {String}   buildId     ID for the build
     * @return {String}               Jenkins job name
     * @private
     */
    _jobName(buildId) {
        return `SD-${buildId}`;
    }

    /**
     * Create Jenkins Executor
     * @constructor
     * @method constructor
     * @param  {Object} options           Configuration options
     * @param  {Object} options.ecosystem                              Screwdriver Ecosystem
     * @param  {Object} options.ecosystem.api                          Routable URI to Screwdriver API
     * @param  {Object} options.ecosystem.store                        Routable URI to Screwdriver Store
     * @param  {Object} options.ecosystem.ui                           Routable URI to Screwdriver UI
     * @param  {String} options.jenkins.host                           Jenkins hostname to make requests to
     * @param  {Number} [options.jenkins.port=8080]                    Jenkins port to make requests to
     * @param  {String} [options.jenkins.username='screwdriver']       Jenkins username
     * @param  {String} options.jenkins.password                       Jenkins password/token
     * @param  {String} [options.jenkins.nodeLabel='screwdriver']      Node labels of Jenkins slaves
     * @param  {Number} [options.jenkins.buildTimeout=90]              Number of minutes to allow a build to run before considering it is
     * @param  {Number} [options.jenkins.maxBuildTimeout=120]          Max timeout user can configure up to
     * @param  {String} [options.docker.composeCommand='docker-compose']    THe path to the docker-compose command
     * @param  {String} [options.docker.launchVersion='stable']        Launcher container version to use
     * @param  {String} [options.docker.prefix='']                     Prefix to all container names
     * @param  {String} [options.docker.memory='4g']                   Memory limit (docker run `--memory` option)
     * @param  {String} [options.docker.memoryLimit='6g']              Memory limit include swap (docker run `--memory-swap` option)
     * @param  {String} [options.buildScript='']                       Shell script to start the job
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
        this[password] = options.jenkins.password;
        this.nodeLabel = options.jenkins.nodeLabel || 'screwdriver';
        this.buildTimeout = options.jenkins.buildTimeout || 90;
        this.maxBuildTimeout = options.jenkins.maxBuildTimeout || 120;
        this.composeCommand = (options.docker && options.docker.composeCommand) || 'docker-compose';
        this.launchVersion = (options.docker && options.docker.launchVersion) || 'stable';
        this.prefix = (options.docker && options.docker.prefix) || '';
        this.memory = (options.docker && options.docker.memory) || '4g';
        this.memoryLimit = (options.docker && options.docker.memoryLimit) || '6g';

        this.buildScript = options.buildScript || '';
        this.cleanupScript = options.cleanupScript || '';
        this.cleanupTimeLimit = options.cleanupTimeLimit || 20;
        this.cleanupWatchInterval = options.cleanupWatchInterval || 2;

        // need to pass port number in the future
        this[baseUrl] = `http://${this.username}:${this[password]}@${this.host}:${this.port}`;
        this.jenkinsClient = jenkins({
            baseUrl: this[baseUrl],
            crumbIssuer: true
        });

        // eslint-disable-next-line no-underscore-dangle
        this.breaker = new Breaker(this._jenkinsCommand.bind(this), options.fusebox);
    }

    /**
     * Create a jenkins job and start the build
     * @async  _start
     * @param  {Object}   config            A configuration object
     * @param  {String}   config.buildId    ID for the build and also name of the job in jenkins
     * @param  {String}   config.container  Container for the build to run in
     * @param  {String}   config.token      JWT to act on behalf of the build
     * @return {Promise}
     */
    async _start(config) {
        const jobName = this._jobName(config.buildId);
        const annotations = this.parseAnnotations(
            hoek.reach(config, 'annotations', { default: {} })
        );

        const xml = this._loadJobXml(config, annotations);
        const buildTimeout = annotations[ANNOTATE_BUILD_TIMEOUT]
            ? Math.min(annotations[ANNOTATE_BUILD_TIMEOUT], this.maxBuildTimeout)
            : this.buildTimeout;

        await this._jenkinsJobCreateOrUpdate(jobName, xml);

        return this.breaker.runCommand({
            module: 'job',
            action: 'build',
            params: [{
                name: jobName,
                parameters: {
                    SD_BUILD_ID: String(config.buildId),
                    SD_TOKEN: config.token,
                    SD_CONTAINER: config.container,
                    SD_API: this.ecosystem.api,
                    SD_STORE: this.ecosystem.store,
                    SD_UI: this.ecosystem.ui,
                    SD_BUILD_TIMEOUT: buildTimeout
                }
            }]
        });
    }

    /**
     * Stop the build
     * @async  _stop
     * @param  {Object}   config            A configuration object
     * @param  {String}   config.buildId    ID for the build
     * @return {Promise}
     */
    async _stop(config) {
        const jobName = this._jobName(config.buildId);

        await this._jenkinsJobStop(jobName);

        return this.breaker.runCommand({
            module: 'job',
            action: 'destroy',
            params: [{ name: jobName }]
        });
    }

    /**
     * Starts a new periodic build in an executor
     * @method _startPeriodic
     * @return {Promise}  Resolves to null since it's not supported
     */
    async _startPeriodic() {
        return Promise.resolve(null);
    }

    /**
     * Stops a new periodic build in an executor
     * @method _stopPeriodic
     * @return {Promise}  Resolves to null since it's not supported
     */
    async _stopPeriodic() {
        return Promise.resolve(null);
    }
}

module.exports = JenkinsExecutor;
