'use strict';

const assert = require('chai').assert;
const sinon = require('sinon');
const mockery = require('mockery');
const fs = require('fs');
const path = require('path');

sinon.assert.expose(assert, { prefix: '' });

const configPath = path.resolve(__dirname, '../config/test-job.xml');
const TEST_XML = fs.readFileSync(configPath, 'utf-8');

describe('index', () => {
    let executor;
    let Executor;
    let fsMock;
    let jenkinsMock;
    let breakerMock;
    let BreakerFactory;

    const config = {
        buildId: '4b8d9b530d2e5e297b4f470d5b0a6e1310d29c5e',
        container: 'node:4',
        apiUri: 'http://localhost:8080',
        token: 'abcdefg'
    };

    const jobName = config.buildId;

    const buildIdConfig = {
        buildId: jobName
    };

    const fakeJobInfo = {
        lastBuild: {
            number: 1
        }
    };

    const buildNumber = fakeJobInfo.lastBuild.number;

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
            host: 'jenkins',
            username: 'admin',
            password: 'fakepassword'
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
        let buildOpts;

        beforeEach(() => {
            createOpts = {
                module: 'job',
                action: 'create',
                params: [jobName, TEST_XML]
            };

            buildOpts = {
                module: 'job',
                action: 'build',
                params: [jobName]
            };
        });

        it('return null when the job is successfully created', (done) => {
            fsMock.readFile.yieldsAsync(null, TEST_XML);
            breakerMock.runCommand.yields(null);

            executor.start(config, (err) => {
                assert.isNull(err);
                assert.calledOnce(fsMock.readFile);
                assert.calledWith(fsMock.readFile, configPath);
                assert.calledWith(breakerMock.runCommand, createOpts);
                assert.calledWith(breakerMock.runCommand, buildOpts);
                done();
            });
        });

        it('return error when fs.readFile is getting error', (done) => {
            const error = new Error('fs.readFile error');

            fsMock.readFile.yieldsAsync(error);
            breakerMock.runCommand.yieldsAsync(null);

            executor.start(config, (err) => {
                assert.deepEqual(err, error);
                done();
            });
        });

        it('return error when job.create is getting error', (done) => {
            const error = new Error('job.create error');

            fsMock.readFile.yieldsAsync(null, TEST_XML);
            breakerMock.runCommand.withArgs(createOpts).yieldsAsync(error);

            executor.start(config, (err) => {
                assert.deepEqual(err, error);
                done();
            });
        });

        it('return error when job.build is getting error', (done) => {
            const error = new Error('job.build error');

            fsMock.readFile.yieldsAsync(null, TEST_XML);
            breakerMock.runCommand.withArgs(createOpts).yieldsAsync(null, null);
            breakerMock.runCommand.withArgs(buildOpts).yieldsAsync(error);

            executor.start(config, (err) => {
                assert.deepEqual(err, error);
                done();
            });
        });
    });

    describe('stop', () => {
        let getOpts;
        let stopOpts;

        beforeEach(() => {
            getOpts = {
                module: 'job',
                action: 'get',
                params: [jobName]
            };

            stopOpts = {
                module: 'build',
                action: 'stop',
                params: [jobName, buildNumber]
            };
        });

        it('return null when the build is successfully stopped', (done) => {
            breakerMock.runCommand.withArgs(getOpts).yields(null, fakeJobInfo);
            breakerMock.runCommand.withArgs(stopOpts).yields(null);

            executor.stop(buildIdConfig, (err) => {
                assert.isNull(err);
                assert.calledWith(breakerMock.runCommand, getOpts);
                assert.calledWith(breakerMock.runCommand, stopOpts);
                done();
            });
        });

        it('return error when there is no build to be stopped yet', (done) => {
            const noBuildJobInfo = {
                lastBuild: null
            };

            breakerMock.runCommand.withArgs(getOpts).yields(null, noBuildJobInfo);
            breakerMock.runCommand.withArgs(stopOpts).yields(null);

            executor.stop(buildIdConfig, (err) => {
                assert.deepEqual(err.message, 'No build has been started yet, try later');
                done();
            });
        });

        it('return error when job.get is getting error', (done) => {
            const error = new Error('job.get error');

            breakerMock.runCommand.withArgs(getOpts).yieldsAsync(error);
            breakerMock.runCommand.withArgs(stopOpts).yields(null);

            executor.stop(buildIdConfig, (err) => {
                assert.deepEqual(err, error);
                done();
            });
        });

        it('return error when build.stop is getting error', (done) => {
            const error = new Error('build.stop error');

            breakerMock.runCommand.withArgs(getOpts).yields(null, fakeJobInfo);
            breakerMock.runCommand.withArgs(stopOpts).yields(error);

            executor.stop(buildIdConfig, (err) => {
                assert.deepEqual(err, error);
                done();
            });
        });
    });

    describe('run without Mocked Breaker', () => {
        beforeEach(() => {
            mockery.deregisterMock('circuit-fuses');
            mockery.resetCache();

            // eslint-disable-next-line global-require
            Executor = require('../index');

            executor = new Executor({
                host: 'jenkins',
                username: 'admin',
                password: 'fakepassword'
            });

            jenkinsMock.job.create = sinon.stub(executor.jenkinsClient.job, 'create');
            jenkinsMock.job.build = sinon.stub(executor.jenkinsClient.job, 'build');
        });

        it('calls jenkins function correctly', (done) => {
            fsMock.readFile.yieldsAsync(null, TEST_XML);
            jenkinsMock.job.create.yieldsAsync(null);
            jenkinsMock.job.build.yieldsAsync(null);

            executor.start(config, (err) => {
                assert.isNull(err);
                assert.calledWith(jenkinsMock.job.create, jobName, TEST_XML);
                assert.calledWith(jenkinsMock.job.build, jobName);
                done();
            });
        });
    });
});
