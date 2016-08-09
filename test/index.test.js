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
    let createOpts;
    let buildOpts;

    const config = {
        buildId: '4b8d9b530d2e5e297b4f470d5b0a6e1310d29c5e',
        jobId: '50dc14f719cdc2c9cb1fb0e49dd2acc4cf6189a0',
        pipelineId: 'ccc49349d3cffbd12ea9e3d41521480b4aa5de5f',
        container: 'node:4',
        scmUrl: 'git@github.com:screwdriver-cd/data-model.git#master'
    };

    const jobName = config.buildId;

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

        mockery.registerMock('fs', fsMock);
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
        Executor = require('../index');

        executor = new Executor({
            host: 'jenkins',
            username: 'admin',
            password: 'fakepassword'
        });

        // eslint-disable-next-line global-require
        const BaseExecutor = require('../node_modules/screwdriver-executor-base/index');

        assert.instanceOf(executor, BaseExecutor);
    });

    describe('start', () => {
        beforeEach(() => {
            BreakerFactory = sinon.stub().returns(breakerMock);
            mockery.registerMock('circuit-fuses', BreakerFactory);

            // eslint-disable-next-line global-require
            Executor = require('../index');

            executor = new Executor({
                host: 'jenkins',
                username: 'admin',
                password: 'fakepassword'
            });

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
            const error = new Error('job.create error');

            fsMock.readFile.yieldsAsync(null, TEST_XML);
            breakerMock.runCommand.withArgs(createOpts).yieldsAsync(null, null);
            breakerMock.runCommand.withArgs(buildOpts).yieldsAsync(error);

            executor.start(config, (err) => {
                assert.deepEqual(err, error);
                done();
            });
        });
    });

    describe('run without Mocked Breaker', () => {
        beforeEach(() => {
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
