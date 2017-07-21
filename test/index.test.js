'use strict';

const assert = require('chai').assert;
const sinon = require('sinon');
const mockery = require('mockery');
const fs = require('fs');
const path = require('path');
const _ = require('lodash');
const xmlescape = require('xml-escape');
const shellescape = require('shell-escape');

sinon.assert.expose(assert, { prefix: '' });

const configPath = path.resolve(__dirname, '../config/job.xml');
const TEST_XML = fs.readFileSync(configPath, 'utf-8');

describe('index', () => {
    let executor;
    let Executor;
    let fsMock;
    let jenkinsMock;
    let breakerMock;
    let BreakerFactory;
    let compiledJobXml;

    const config = {
        buildId: 1993,
        container: 'node:4',
        apiUri: 'http://localhost:8080',
        token: 'abcdefg'
    };

    const jobName = `SD-${config.buildId}`;

    const nodeLabel = 'node-label-foo';

    const ecosystem = {
        api: 'api',
        ui: 'ui',
        store: 'store'
    };

    const buildParameters = {
        SD_BUILD_ID: String(config.buildId),
        SD_TOKEN: config.token,
        SD_CONTAINER: config.container,
        SD_API: ecosystem.api,
        SD_STORE: ecosystem.store
    };

    const buildIdConfig = {
        buildId: config.buildId
    };

    const fakeJobInfo = {
        lastBuild: {
            number: 1
        }
    };

    const fakeCompletedJobInfo = {
        lastBuild: {
            number: 1
        },
        lastCompletedBuild: {
            number: 1
        }
    };

    const buildNumber = fakeJobInfo.lastBuild.number;

    const buildScript = '/opt/bin/sd-build-test-<should-escape-xml>';

    const cleanupScript = '/opt/bin/sd-cleanup-test-<should-escape-xml>';

    const cleanupWatchInterval = 0.01;

    before(() => {
        mockery.enable({
            useCleanCache: true,
            warnOnUnregistered: false
        });
    });

    beforeEach(() => {
        fsMock = {
            readFile: sinon.stub()
        };

        jenkinsMock = {
            job: {
                create: sinon.stub(),
                exists: sinon.stub(),
                config: sinon.stub(),
                build: sinon.stub()
            }
        };

        breakerMock = {
            runCommand: sinon.stub()
        };

        BreakerFactory = sinon.stub().returns(breakerMock);

        mockery.registerMock('fs', fsMock);
        mockery.registerMock('circuit-fuses', BreakerFactory);

        // eslint-disable-next-line global-require
        Executor = require('../index');

        executor = new Executor({
            ecosystem,
            jenkins: {
                host: 'jenkins',
                username: 'admin',
                password: 'fakepassword',
                nodeLabel
            },
            buildScript,
            cleanupScript,
            cleanupWatchInterval
        });
        compiledJobXml = _.template(TEST_XML)({
            nodeLabel: xmlescape(nodeLabel),
            buildScript: xmlescape(buildScript),
            cleanupScript: xmlescape(cleanupScript)
        });
    });

    afterEach(() => {
        mockery.deregisterAll();
        mockery.resetCache();
    });

    after(() => {
        mockery.disable();
    });

    it('extends base class', () => {
        // eslint-disable-next-line global-require
        const BaseExecutor = require('../node_modules/screwdriver-executor-base/index');

        assert.instanceOf(executor, BaseExecutor);
    });

    describe('start', () => {
        let createOpts;
        let configOpts;
        let existsOpts;
        let buildOpts;

        beforeEach(() => {
            createOpts = {
                module: 'job',
                action: 'create',
                params: [{ name: jobName, xml: compiledJobXml }]
            };

            configOpts = {
                module: 'job',
                action: 'config',
                params: [{ name: jobName, xml: compiledJobXml }]
            };

            existsOpts = {
                module: 'job',
                action: 'exists',
                params: [{ name: jobName }]
            };

            buildOpts = {
                module: 'job',
                action: 'build',
                params: [{
                    name: jobName,
                    parameters: buildParameters
                }]
            };
        });

        it('return null when the job is successfully created', (done) => {
            fsMock.readFile.yieldsAsync(null, TEST_XML);

            breakerMock.runCommand.withArgs(existsOpts).resolves(false);

            executor.start(config).then(() => {
                assert.calledOnce(fsMock.readFile);
                assert.calledWith(fsMock.readFile, configPath);
                assert.calledWith(breakerMock.runCommand, existsOpts);
                assert.calledWith(breakerMock.runCommand, createOpts);
                assert.calledWith(breakerMock.runCommand, buildOpts);
                done();
            });
        });

        it('update job when job already exists', (done) => {
            fsMock.readFile.yieldsAsync(null, TEST_XML);

            breakerMock.runCommand.withArgs(existsOpts).resolves(true);

            executor.start(config).then(() => {
                assert.calledOnce(fsMock.readFile);
                assert.calledWith(fsMock.readFile, configPath);
                assert.calledWith(breakerMock.runCommand, existsOpts);
                assert.calledWith(breakerMock.runCommand, configOpts);
                assert.calledWith(breakerMock.runCommand, buildOpts);
                done();
            });
        });

        it('return error when fs.readFile is getting error', (done) => {
            const error = new Error('fs.readFile error');

            fsMock.readFile.yieldsAsync(error);

            executor.start(config).catch((err) => {
                assert.deepEqual(err, error);
                done();
            });
        });

        it('return error when job.create is getting error', (done) => {
            const error = new Error('job.create error');

            fsMock.readFile.yieldsAsync(null, TEST_XML);
            breakerMock.runCommand.withArgs(createOpts).rejects(error);

            executor.start(config).catch((err) => {
                assert.deepEqual(err, error);
                done();
            });
        });

        it('return error when job.build is getting error', (done) => {
            const error = new Error('job.build error');

            fsMock.readFile.yieldsAsync(null, TEST_XML);
            breakerMock.runCommand.withArgs(createOpts).resolves('ok');
            breakerMock.runCommand.withArgs(buildOpts).rejects(error);

            executor.start(config).catch((err) => {
                assert.deepEqual(err, error);
                done();
            });
        });

        it('return error when job.config is getting error', (done) => {
            const error = new Error('job.build error');

            fsMock.readFile.yieldsAsync(null, TEST_XML);
            breakerMock.runCommand.withArgs(existsOpts).resolves(true);
            breakerMock.runCommand.withArgs(configOpts).rejects(error);

            executor.start(config).catch((err) => {
                assert.deepEqual(err, error);
                done();
            });
        });
    });

    describe('stop', () => {
        let getOpts;
        let stopOpts;
        let destroyOpts;

        beforeEach(() => {
            getOpts = {
                module: 'job',
                action: 'get',
                params: [{ name: jobName }]
            };

            stopOpts = {
                module: 'build',
                action: 'stop',
                params: [{ name: jobName, number: buildNumber }]
            };

            destroyOpts = {
                module: 'job',
                action: 'destroy',
                params: [{ name: jobName }]
            };
        });

        it('return null when the build is successfully stopped', (done) => {
            breakerMock.runCommand.withArgs(getOpts).onCall(0).resolves(fakeJobInfo);
            breakerMock.runCommand.withArgs(getOpts).onCall(1).resolves(fakeCompletedJobInfo);
            breakerMock.runCommand.withArgs(stopOpts).resolves(null);
            breakerMock.runCommand.withArgs(destroyOpts).resolves(null);

            executor.stop(buildIdConfig).then((ret) => {
                assert.isNull(ret);
                assert.calledWith(breakerMock.runCommand, getOpts);
                assert.calledWith(breakerMock.runCommand, stopOpts);
                assert.calledWith(breakerMock.runCommand, destroyOpts);
                done();
            });
        });

        it('return null when the build is successfully stopped after a while', (done) => {
            breakerMock.runCommand.withArgs(getOpts).onCall(0).resolves(fakeJobInfo);
            breakerMock.runCommand.withArgs(getOpts).onCall(1).resolves(fakeJobInfo);
            breakerMock.runCommand.withArgs(getOpts).onCall(2).resolves(fakeCompletedJobInfo);
            breakerMock.runCommand.withArgs(stopOpts).resolves(null);
            breakerMock.runCommand.withArgs(destroyOpts).resolves(null);

            executor.stop(buildIdConfig).then((ret) => {
                assert.isNull(ret);
                assert.calledWith(breakerMock.runCommand, getOpts);
                assert.calledWith(breakerMock.runCommand, stopOpts);
                assert.calledWith(breakerMock.runCommand, destroyOpts);
                done();
            });
        });

        it('return null when the build is successfully stopped after cleanup timeout', (done) => {
            // change executor's 'internal config
            executor.cleanupTimeLimit = 0.05;

            breakerMock.runCommand.withArgs(getOpts).resolves(fakeJobInfo);
            breakerMock.runCommand.withArgs(stopOpts).resolves(null);
            breakerMock.runCommand.withArgs(destroyOpts).resolves(null);

            executor.stop(buildIdConfig).then((ret) => {
                assert.isNull(ret);
                assert.calledWith(breakerMock.runCommand, getOpts);
                assert.calledWith(breakerMock.runCommand, stopOpts);
                assert.calledWith(breakerMock.runCommand, destroyOpts);
                done();
            });
        });

        it('return error when there is no build to be stopped yet', (done) => {
            const noBuildJobInfo = {
                lastBuild: null
            };

            breakerMock.runCommand.withArgs(getOpts).resolves(noBuildJobInfo);
            breakerMock.runCommand.withArgs(stopOpts).resolves(null);

            executor.stop(buildIdConfig).catch((err) => {
                assert.deepEqual(err.message, 'No build has been started yet, try later');
                done();
            });
        });

        it('return error when job.get is getting error', (done) => {
            const error = new Error('job.get error');

            breakerMock.runCommand.withArgs(getOpts).rejects(error);
            breakerMock.runCommand.withArgs(stopOpts).resolves();

            executor.stop(buildIdConfig).catch((err) => {
                assert.deepEqual(err, error);
                done();
            });
        });

        it('return error when build.stop is getting error', (done) => {
            const error = new Error('build.stop error');

            breakerMock.runCommand.withArgs(getOpts).resolves(fakeJobInfo);
            breakerMock.runCommand.withArgs(stopOpts).rejects(error);

            executor.stop(buildIdConfig).catch((err) => {
                assert.deepEqual(err, error);
                done();
            });
        });

        it('return error when second job.get is getting error', (done) => {
            const error = new Error('job.get error');

            breakerMock.runCommand.withArgs(getOpts).onCall(0).resolves(fakeJobInfo);
            breakerMock.runCommand.withArgs(getOpts).onCall(1).rejects(error);
            breakerMock.runCommand.withArgs(stopOpts).resolves();

            executor.stop(buildIdConfig).catch((err) => {
                assert.deepEqual(err, error);
                done();
            });
        });
    });

    describe('use docker', () => {
        beforeEach(() => {
            mockery.deregisterMock('circuit-fuses');
            mockery.resetCache();

            // eslint-disable-next-line global-require
            Executor = require('../index');

            executor = new Executor({
                ecosystem,
                jenkins: {
                    host: 'jenkins',
                    username: 'admin',
                    password: 'fakepassword'
                }
            });

            const taskScript = executor._dockerTaskScript(config);

            compiledJobXml = _.template(TEST_XML)({
                nodeLabel: 'screwdriver',
                buildScript: xmlescape(taskScript.buildScript),
                cleanupScript: xmlescape(taskScript.cleanupScript)
            });

            jenkinsMock.job.create = sinon.stub(executor.jenkinsClient.job, 'create');
            jenkinsMock.job.config = sinon.stub(executor.jenkinsClient.job, 'config');
            jenkinsMock.job.exists = sinon.stub(executor.jenkinsClient.job, 'exists');
            jenkinsMock.job.build = sinon.stub(executor.jenkinsClient.job, 'build');
        });

        it('calls jenkins function correctly', (done) => {
            fsMock.readFile.yieldsAsync(null, compiledJobXml);
            jenkinsMock.job.exists.yieldsAsync(null, false);
            jenkinsMock.job.create.yieldsAsync(null);
            jenkinsMock.job.build.yieldsAsync(null);

            executor.start(config).then(() => {
                assert.calledWith(jenkinsMock.job.create, { name: jobName, xml: compiledJobXml });
                assert.calledWith(jenkinsMock.job.build,
                                  { name: jobName, parameters: buildParameters });
                done();
            });
        });

        it('run docker command with default options correctly', () => {
            // build container
            assert.include(compiledJobXml, xmlescape(shellescape(['--memory', '4g'])));
            assert.include(compiledJobXml, xmlescape(shellescape(['--memory-swap', '6g'])));
            assert.include(compiledJobXml, xmlescape(config.container));

            // launcher container
            assert.include(compiledJobXml,
                           xmlescape(shellescape(['--label', `sdbuild=${config.buildId}`])));
            assert.include(compiledJobXml, xmlescape('screwdrivercd/launcher:stable'));
        });

        it('run docker command with provided options correctly', () => {
            const executorConfig = {
                ecosystem,
                jenkins: {
                    host: 'jenkins',
                    username: 'admin',
                    password: 'fakepassword',
                    nodeLabel
                },
                docker: {
                    command: '/foo/docker',
                    memory: '1g',
                    memoryLimit: '2g',
                    prefix: 'foo-prefix',
                    launchVersion: 'foo-ver'
                }
            };

            executor = new Executor(executorConfig);

            const build = executor._dockerTaskScript(config).buildScript;

            // build container
            assert.include(build,
                           shellescape(['--memory', executorConfig.docker.memory]));
            assert.include(build,
                           shellescape(['--memory-swap', executorConfig.docker.memoryLimit]));

            // launcher container
            const label = `sdbuild=${executorConfig.docker.prefix}${config.buildId}`;

            assert.include(build,
                           shellescape(['--label', label]));
            assert.include(build,
                           `screwdrivercd/launcher:${executorConfig.docker.launchVersion}`);
        });
    });

    describe('run without Mocked Breaker', () => {
        beforeEach(() => {
            mockery.deregisterMock('circuit-fuses');
            mockery.resetCache();

            // eslint-disable-next-line global-require
            Executor = require('../index');

            executor = new Executor({
                ecosystem,
                jenkins: {
                    host: 'jenkins',
                    username: 'admin',
                    password: 'fakepassword',
                    nodeLabel
                },
                buildScript,
                cleanupScript
            });

            jenkinsMock.job.create = sinon.stub(executor.jenkinsClient.job, 'create');
            jenkinsMock.job.config = sinon.stub(executor.jenkinsClient.job, 'config');
            jenkinsMock.job.exists = sinon.stub(executor.jenkinsClient.job, 'exists');
            jenkinsMock.job.build = sinon.stub(executor.jenkinsClient.job, 'build');
        });

        it('calls jenkins function correctly', (done) => {
            fsMock.readFile.yieldsAsync(null, TEST_XML);
            jenkinsMock.job.exists.yieldsAsync(null, false);
            jenkinsMock.job.create.yieldsAsync(null);
            jenkinsMock.job.build.yieldsAsync(null);

            executor.start(config).then(() => {
                assert.calledWith(jenkinsMock.job.create, { name: jobName, xml: compiledJobXml });
                assert.calledWith(jenkinsMock.job.build,
                                  { name: jobName, parameters: buildParameters });
                done();
            });
        });
    });
});
