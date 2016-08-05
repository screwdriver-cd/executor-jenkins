'use strict';
/* eslint-disable no-console*/
const assert = require('chai').assert;
const sinon = require('sinon');
const mockery = require('mockery');

sinon.assert.expose(assert, { prefix: '' });

const TEST_XML =
`<project>
<description/>
<keepDependencies>false</keepDependencies>
<properties/>
<scm class="hudson.scm.NullSCM"/>
<canRoam>true</canRoam>
<disabled>false</disabled>
<blockBuildWhenDownstreamBuilding>false</blockBuildWhenDownstreamBuilding>
<blockBuildWhenUpstreamBuilding>false</blockBuildWhenUpstreamBuilding>
<triggers/>
<concurrentBuild>false</concurrentBuild>
<builders>
<hudson.tasks.Shell>
<command>sleep 100 | echo 'Hello, I am going to sleep for 100s!'</command>
</hudson.tasks.Shell>
</builders>
<publishers/>
<buildWrappers/>
</project>`;

describe('index', () => {
    let executor;
    let Executor;
    let fsMock;
    let jenkinsMock;
    let requestMock;
    let getCrumbMock;
    let getBuildNumberMock;
    let jenkinsClientMock;
    let initJenkinsClientMock;

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

    const fakeCrumb = {
        statusCode: 200,
        body: {
            _class: 'hudson.security.csrf.DefaultCrumbIssuer',
            crumb: '24e80888069a1beaa5af3e0e3ef201d0',
            crumbRequestField: 'Jenkins-Crumb'
        }
    };

    const fakeJobInfo = {
        lastBuild: {
            number: 1
        }
    };

    const buildNumber = fakeJobInfo.lastBuild.number;

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

        jenkinsMock = sinon.stub();

        requestMock = sinon.stub();

        jenkinsClientMock = {
            job: {
                create: sinon.stub(),
                get: sinon.stub(),
                build: sinon.stub()
            },
            build: {
                stop: sinon.stub(),
                log: sinon.stub()
            }
        };

        fsMock.readFile.yieldsAsync(null, TEST_XML);

        mockery.registerMock('fs', fsMock);
        mockery.registerMock('jenkins', jenkinsMock);
        mockery.registerMock('request', requestMock);

        /* eslint-disable global-require */
        Executor = require('../index');
        /* eslint-enable global-require */

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
        /* eslint-disable global-require */
        const BaseExecutor = require('../node_modules/screwdriver-executor-base/index');
        /* eslint-enable global-require */

        assert.instanceOf(executor, BaseExecutor);
    });

    describe('initJenkinsClient', () => {
        it('return jenkinsClient object when request successes', (done) => {
            const opts = {
                baseUrl: executor.baseUrl,
                headers: {
                    [fakeCrumb.body.crumbRequestField]: fakeCrumb.body.crumb
                }
            };

            jenkinsMock.returns(jenkinsClientMock);

            executor.initJenkinsClient(JSON.stringify(fakeCrumb.body), (err, response) => {
                assert.isNull(err);
                assert.calledOnce(jenkinsMock);
                assert.calledWith(jenkinsMock, opts);
                assert.deepEqual(response, jenkinsClientMock);
                done();
            });
        });

        // it('return error when jenkins() fails to instantiate a jenkins client', (done) => {
        //     const error = new Error('Failed to instantiate jenkins client');
        //
        //     jenkinsMock.returns(null);
        //
        //     executor.initJenkinsClient(JSON.stringify(fakeCrumb.body), (err) => {
        //         assert.deepEqual(err.message, error.message);
        //         done();
        //     });
        // });
    });

    describe('getCrumb', () => {
        it('return crumb object when request successes', (done) => {
            const crumbConfig = {
                uri: crumbUrl,
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

    describe('getBuildNumber', () => {
        it('return build number of the last build of the given job', (done) => {
            jenkinsClientMock.job.get.yieldsAsync(null, fakeJobInfo);

            executor.getBuildNumber(jobName, jenkinsClientMock,
                 (err, jenkinsClient, buildNumberData) => {
                     assert.isNull(err);
                     assert.calledOnce(jenkinsClientMock.job.get);
                     assert.calledWith(jenkinsClientMock.job.get, jobName);
                     assert.deepEqual(buildNumberData, buildNumber);
                     done();
                 });
        });

        it('return error when jenkinsClientMock.job.get cannot get the job', (done) => {
            const error = new Error('jenkinsClientMock.job.get no job error');

            jenkinsClientMock.job.get.yieldsAsync(error);

            executor.getBuildNumber(jobName, jenkinsClientMock,
                 (err) => {
                     assert.deepEqual(err, error);
                     done();
                 });
        });

        it('return error when jenkinsClientMock.job.get cannot get build number', (done) => {
            const JobWithoutBuild = {
                lastBuild: null
            };

            jenkinsClientMock.job.get.yieldsAsync(null, JobWithoutBuild);

            executor.getBuildNumber(jobName, jenkinsClientMock,
                 (err) => {
                     assert.deepEqual(err.message, 'No build has been started yet, try later');
                     done();
                 });
        });
    });

    describe('start', () => {
        beforeEach(() => {
            getCrumbMock = sinon.stub(executor, 'getCrumb');
            initJenkinsClientMock = sinon.stub(executor, 'initJenkinsClient');
        });

        it('return null when the job is successfully created', (done) => {
            getCrumbMock.yieldsAsync(null, fakeCrumb.body);
            initJenkinsClientMock.yieldsAsync(null, jenkinsClientMock);
            jenkinsClientMock.job.create.yieldsAsync(null);
            jenkinsClientMock.job.build.yieldsAsync(null);

            executor.start(config, (err) => {
                assert.isNull(err);
                assert.calledOnce(getCrumbMock);
                assert.calledOnce(initJenkinsClientMock);
                assert.calledOnce(fsMock.readFile);
                assert.calledOnce(jenkinsClientMock.job.create);
                assert.calledWith(jenkinsClientMock.job.create, jobName, TEST_XML);
                assert.calledOnce(jenkinsClientMock.job.build);
                assert.calledWith(jenkinsClientMock.job.build, jobName);
                done();
            });
        });

        it('return error when getCrumbs is getting error', (done) => {
            const error = new Error('getCrumb error');

            getCrumbMock.yieldsAsync(error);
            initJenkinsClientMock.yieldsAsync(null);
            jenkinsClientMock.job.create.yieldsAsync(null);
            jenkinsClientMock.job.build.yieldsAsync(null);

            executor.start(config, (err) => {
                assert.deepEqual(err, error);
                done();
            });
        });

        it('return error when initJenkinsClient is getting error', (done) => {
            const error = new Error('initJenkinsClient error');

            getCrumbMock.yieldsAsync(null, fakeCrumb.body);
            initJenkinsClientMock.yieldsAsync(error);
            jenkinsClientMock.job.create.yieldsAsync(null);
            jenkinsClientMock.job.build.yieldsAsync(null);

            executor.start(config, (err) => {
                assert.deepEqual(err, error);
                done();
            });
        });

        it('return error when jenkinsClient.job.create is getting error', (done) => {
            const error = new Error('jenkinsClient.job.create error');

            getCrumbMock.yieldsAsync(null, fakeCrumb.body);
            initJenkinsClientMock.yieldsAsync(null, jenkinsClientMock);
            jenkinsClientMock.job.create.yieldsAsync(error);
            jenkinsClientMock.job.build.yieldsAsync(null);

            executor.start(config, (err) => {
                assert.deepEqual(err, error);
                done();
            });
        });

        it('return error when jenkinsClient.job.build is getting error', (done) => {
            const error = new Error('jenkinsClient.job.build error');

            getCrumbMock.yieldsAsync(null, fakeCrumb.body);
            initJenkinsClientMock.yieldsAsync(null, jenkinsClientMock);
            jenkinsClientMock.job.create.yieldsAsync(null);
            jenkinsClientMock.job.build.yieldsAsync(error);

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
            getBuildNumberMock = sinon.stub(executor, 'getBuildNumber');
        });

        it('return null when the job is successfully stopped', (done) => {
            getCrumbMock.yieldsAsync(null, fakeCrumb.body);
            initJenkinsClientMock.yieldsAsync(null, jenkinsClientMock);
            getBuildNumberMock.yieldsAsync(null, jenkinsClientMock, buildNumber);
            jenkinsClientMock.build.stop.yieldsAsync(null);

            executor.stop(buildIdConfig, (err) => {
                assert.isNull(err);
                assert.calledOnce(getCrumbMock);
                assert.calledOnce(initJenkinsClientMock);
                assert.calledOnce(getBuildNumberMock);
                assert.calledWith(getBuildNumberMock, jobName, jenkinsClientMock);
                assert.calledOnce(jenkinsClientMock.build.stop);
                assert.calledWith(jenkinsClientMock.build.stop, jobName,
                    buildNumber);
                done();
            });
        });

        it('return error when getCrumbs is getting error', (done) => {
            const error = new Error('getCrumb error');

            getCrumbMock.yieldsAsync(error);
            initJenkinsClientMock.yieldsAsync(null);
            getBuildNumberMock.yieldsAsync(null);
            jenkinsClientMock.build.stop.yieldsAsync(null);

            executor.stop(buildIdConfig, (err) => {
                assert.deepEqual(err, error);
                done();
            });
        });

        it('return error when initJenkinsClient is getting error', (done) => {
            const error = new Error('initJenkinsClient error');

            getCrumbMock.yieldsAsync(null, fakeCrumb.body);
            initJenkinsClientMock.yieldsAsync(error);
            getBuildNumberMock.yieldsAsync(null);
            jenkinsClientMock.build.stop.yieldsAsync(null);

            executor.stop(buildIdConfig, (err) => {
                assert.deepEqual(err, error);
                done();
            });
        });

        it('return error when getBuildNumber is getting error', (done) => {
            const error = new Error('getBuildNumber error');

            getCrumbMock.yieldsAsync(null, fakeCrumb.body);
            initJenkinsClientMock.yieldsAsync(null, jenkinsClientMock);
            getBuildNumberMock.yieldsAsync(error);
            jenkinsClientMock.build.stop.yieldsAsync(null);

            executor.stop(buildIdConfig, (err) => {
                assert.deepEqual(err, error);
                done();
            });
        });

        it('return error when jenkinsClient.build.stop is getting error', (done) => {
            const error = new Error('jenkinsClient.build.stop error');

            getCrumbMock.yieldsAsync(null, fakeCrumb.body);
            initJenkinsClientMock.yieldsAsync(null, jenkinsClientMock);
            getBuildNumberMock.yieldsAsync(null, jenkinsClientMock, buildNumber);
            jenkinsClientMock.build.stop.yieldsAsync(error);

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
            getBuildNumberMock = sinon.stub(executor, 'getBuildNumber');
        });

        it('return log when the the build is successfully streamed', (done) => {
            const log = 'echo "hello world"';

            getCrumbMock.yieldsAsync(null, fakeCrumb.body);
            initJenkinsClientMock.yieldsAsync(null, jenkinsClientMock);
            getBuildNumberMock.yieldsAsync(null, jenkinsClientMock, buildNumber);
            jenkinsClientMock.build.log.yieldsAsync(null, log);

            executor.stream(buildIdConfig, (err, data) => {
                assert.isNull(err);
                assert.calledOnce(getCrumbMock);
                assert.calledOnce(initJenkinsClientMock);
                assert.calledOnce(getBuildNumberMock);
                assert.calledWith(getBuildNumberMock, jobName, jenkinsClientMock);
                assert.calledOnce(jenkinsClientMock.build.log);
                assert.calledWith(jenkinsClientMock.build.log, jobName,
                    buildNumber);
                assert.deepEqual(data, log);
                done();
            });
        });

        it('return error when getCrumbs is getting error', (done) => {
            const error = new Error('getCrumb error');

            getCrumbMock.yieldsAsync(error);
            initJenkinsClientMock.yieldsAsync(null);
            getBuildNumberMock.yieldsAsync(null);
            jenkinsClientMock.build.log.yieldsAsync(null);

            executor.stream(buildIdConfig, (err) => {
                assert.deepEqual(err, error);
                done();
            });
        });

        it('return error when initJenkinsClient is getting error', (done) => {
            const error = new Error('initJenkinsClient error');

            getCrumbMock.yieldsAsync(null, fakeCrumb.body);
            initJenkinsClientMock.yieldsAsync(error);
            getBuildNumberMock.yieldsAsync(null);
            jenkinsClientMock.build.log.yieldsAsync(null);

            executor.stream(buildIdConfig, (err) => {
                assert.deepEqual(err, error);
                done();
            });
        });

        it('return error when getBuildNumber is getting error', (done) => {
            const error = new Error('getBuildNumber error');

            getCrumbMock.yieldsAsync(null, fakeCrumb.body);
            initJenkinsClientMock.yieldsAsync(null, jenkinsClientMock);
            getBuildNumberMock.yieldsAsync(error);
            jenkinsClientMock.build.log.yieldsAsync(null);

            executor.stream(buildIdConfig, (err) => {
                assert.deepEqual(err, error);
                done();
            });
        });

        it('return error when jenkinsClientMock.build.log is getting error', (done) => {
            const error = new Error('jenkinsClientMock.job.log error');

            getCrumbMock.yieldsAsync(null, fakeCrumb.body);
            initJenkinsClientMock.yieldsAsync(null, jenkinsClientMock);
            getBuildNumberMock.yieldsAsync(null, jenkinsClientMock, buildNumber);
            jenkinsClientMock.build.log.yieldsAsync(error);

            executor.stream(buildIdConfig, (err) => {
                assert.deepEqual(err, error);
                done();
            });
        });
    });
});
