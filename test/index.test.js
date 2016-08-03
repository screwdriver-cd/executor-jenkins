'use strict';
/* eslint-disable no-console*/
const assert = require('chai').assert;
const sinon = require('sinon');
const mockery = require('mockery');

sinon.assert.expose(assert, { prefix: '' });

describe('index', () => {
    let executor;
    let Executor;
    let requestMock;
    let getCrumbMock;
    let jenkinsClientMock;
    let initJenkinsClientMock;
    let readConfigAndCreateJobMock;
    let stopCurrentBuildMock;
    let getBuildLogMock;

    const fakeCrumb = {
        statusCode: 200,
        body: {
            _class: 'hudson.security.csrf.DefaultCrumbIssuer',
            crumb: '24e80888069a1beaa5af3e0e3ef201d0',
            crumbRequestField: 'Jenkins-Crumb'
        }
    };

    const crumbUrl = 'http://admin:fakepassword@jenkins:8080/crumbIssuer/api/json';

    const config = {
        buildId: '4b8d9b530d2e5e297b4f470d5b0a6e1310d29c5e',
        jobId: '50dc14f719cdc2c9cb1fb0e49dd2acc4cf6189a0',
        pipelineId: 'ccc49349d3cffbd12ea9e3d41521480b4aa5de5f',
        container: 'node:4',
        scmUrl: 'git@github.com:screwdriver-cd/data-model.git#master'
    };

    const buildIdConfig = {
        buildId: '4b8d9b530d2e5e297b4f470d5b0a6e1310d29c5e'
    };

    before(() => {
        mockery.enable({
            useCleanCache: true,
            warnOnUnregistered: false
        });
    });

    beforeEach(() => {
        requestMock = sinon.stub();

        jenkinsClientMock = {
            job: {
                create: sinon.stub(),
                get: sinon.stub()
            },
            build: {
                stop: sinon.stub(),
                log: sinon.stub()
            }
        };

        mockery.registerMock('request', requestMock);

        /* eslint-disable global-require */
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
        assert.isFunction(executor.start);
        assert.isFunction(executor.stream);
        assert.isFunction(executor.stop);
    });

    describe('getCrumb', () => {
        it('return crumb object when request successes', (done) => {
            const crumbConfig = {
                url: crumbUrl,
                method: 'GET'
            };

            requestMock.yieldsAsync(null, fakeCrumb);

            executor.getCrumb((err, response) => {
                assert.isNull(err);
                assert.calledOnce(requestMock);
                assert.calledWith(requestMock, crumbConfig);
                assert.deepEqual(fakeCrumb.body, response);
                done();
            });
        });

        it('return error when request responds with error', (done) => {
            const error = new Error('T_T');

            requestMock.yieldsAsync(error);

            executor.getCrumb((err) => {
                assert.deepEqual(err, error);
                done();
            });
        });

        it('return error when request responds with non 200 status code', (done) => {
            const error = new Error('Failed to get crumb: {"any":"thing"}');

            requestMock.yieldsAsync(null, {
                statusCode: 201,
                body: {
                    any: 'thing'
                }
            });

            executor.getCrumb((err, response) => {
                assert.deepEqual(err, error);
                assert.isNotOk(response);
                done();
            });
        });
    });

    describe('start', () => {
        beforeEach(() => {
            getCrumbMock = sinon.stub(executor, 'getCrumb');
            initJenkinsClientMock = sinon.stub(executor, 'initJenkinsClient');
            readConfigAndCreateJobMock = sinon.stub(executor, 'readConfigAndCreateJob');
        });

        it('return null when the job is successfully created', (done) => {
            getCrumbMock.yieldsAsync(null, fakeCrumb.body);
            initJenkinsClientMock.yieldsAsync(null, jenkinsClientMock);
            readConfigAndCreateJobMock.yieldsAsync(null);

            executor.start(config, (err) => {
                assert.isNull(err);
                assert.calledOnce(getCrumbMock);
                assert.calledOnce(initJenkinsClientMock);
                assert.calledOnce(readConfigAndCreateJobMock);
                done();
            });
        });

        it('return error when getCrumbs is getting error', (done) => {
            const error = new Error('getCrumb error');

            getCrumbMock.yieldsAsync(error);
            initJenkinsClientMock.yieldsAsync(null, null);
            readConfigAndCreateJobMock.yieldsAsync(null);

            executor.start(config, (err) => {
                assert.deepEqual(err, error);
                done();
            });
        });

        it('return error when initJenkinsClient is getting error', (done) => {
            const error = new Error('initJenkinsClient error');

            getCrumbMock.yieldsAsync(null, fakeCrumb.body);
            initJenkinsClientMock.yieldsAsync(error);
            readConfigAndCreateJobMock.yieldsAsync(null);

            executor.start(config, (err) => {
                assert.deepEqual(err, error);
                done();
            });
        });

        it('return error when readConfigAndCreateJob is getting error', (done) => {
            const error = new Error('readConfigAndCreateJob error');

            getCrumbMock.yieldsAsync(null, fakeCrumb.body);
            initJenkinsClientMock.yieldsAsync(null, jenkinsClientMock);
            readConfigAndCreateJobMock.yieldsAsync(error);

            executor.start(config, (err) => {
                assert.deepEqual(err, error);
                done();
            });
        });
    });

    describe('stop', () => {
        beforeEach(() => {
            getCrumbMock = sinon.stub(executor, 'getCrumb');
            initJenkinsClientMock = sinon.stub(executor, 'initJenkinsClient');
            stopCurrentBuildMock = sinon.stub(executor, 'stopCurrentBuild');
        });

        it('return null when the job is successfully stopped', (done) => {
            getCrumbMock.yieldsAsync(null, fakeCrumb.body);
            initJenkinsClientMock.yieldsAsync(null, jenkinsClientMock);
            stopCurrentBuildMock.yieldsAsync(null);

            executor.stop(buildIdConfig, (err) => {
                assert.isNull(err);
                assert.calledOnce(getCrumbMock);
                assert.calledOnce(initJenkinsClientMock);
                assert.calledOnce(stopCurrentBuildMock);
                done();
            });
        });

        it('return error when getCrumbs is getting error', (done) => {
            const error = new Error('getCrumb error');

            getCrumbMock.yieldsAsync(error);
            initJenkinsClientMock.yieldsAsync(null, null);
            stopCurrentBuildMock.yieldsAsync(null);

            executor.stop(buildIdConfig, (err) => {
                assert.deepEqual(err, error);
                done();
            });
        });

        it('return error when initJenkinsClient is getting error', (done) => {
            const error = new Error('initJenkinsClient error');

            getCrumbMock.yieldsAsync(null, fakeCrumb.body);
            initJenkinsClientMock.yieldsAsync(error);
            stopCurrentBuildMock.yieldsAsync(null);

            executor.stop(buildIdConfig, (err) => {
                assert.deepEqual(err, error);
                done();
            });
        });

        it('return error when stopCurrentBuild is getting error', (done) => {
            const error = new Error('stopCurrentBuild error');

            getCrumbMock.yieldsAsync(null, fakeCrumb.body);
            initJenkinsClientMock.yieldsAsync(null, jenkinsClientMock);
            stopCurrentBuildMock.yieldsAsync(error);

            executor.stop(buildIdConfig, (err) => {
                assert.deepEqual(err, error);
                done();
            });
        });
    });

    describe('stream', () => {
        beforeEach(() => {
            getCrumbMock = sinon.stub(executor, 'getCrumb');
            initJenkinsClientMock = sinon.stub(executor, 'initJenkinsClient');
            getBuildLogMock = sinon.stub(executor, 'getBuildLog');
        });

        it('return log when the the build is successfully streamed', (done) => {
            const log = 'echo "hello world"';

            getCrumbMock.yieldsAsync(null, fakeCrumb.body);
            initJenkinsClientMock.yieldsAsync(null, jenkinsClientMock);
            getBuildLogMock.yieldsAsync(null, log);

            executor.stream(buildIdConfig, (err, data) => {
                assert.isNull(err);
                assert.calledOnce(getCrumbMock);
                assert.calledOnce(initJenkinsClientMock);
                assert.calledOnce(getBuildLogMock);
                assert.deepEqual(data, log);
                done();
            });
        });

        it('return error when getCrumbs is getting error', (done) => {
            const error = new Error('getCrumb error');

            getCrumbMock.yieldsAsync(error);
            initJenkinsClientMock.yieldsAsync(null, null);
            getBuildLogMock.yieldsAsync(null);

            executor.stream(buildIdConfig, (err) => {
                assert.deepEqual(err, error);
                done();
            });
        });

        it('return error when initJenkinsClient is getting error', (done) => {
            const error = new Error('initJenkinsClient error');

            getCrumbMock.yieldsAsync(null, fakeCrumb.body);
            initJenkinsClientMock.yieldsAsync(error);
            getBuildLogMock.yieldsAsync(null);

            executor.stream(buildIdConfig, (err) => {
                assert.deepEqual(err, error);
                done();
            });
        });

        it('return error when getBuildLog is getting error', (done) => {
            const error = new Error('getBuildLog error');

            getCrumbMock.yieldsAsync(null, fakeCrumb.body);
            initJenkinsClientMock.yieldsAsync(null, jenkinsClientMock);
            getBuildLogMock.yieldsAsync(error);

            executor.stream(buildIdConfig, (err) => {
                assert.deepEqual(err, error);
                done();
            });
        });
    });
});
