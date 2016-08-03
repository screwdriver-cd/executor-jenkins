'use strict';
/* eslint-disable no-console*/
const assert = require('chai').assert;
const sinon = require('sinon');
const mockery = require('mockery');

sinon.assert.expose(assert, { prefix: '' });

<<<<<<< HEAD
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
<<<<<<< HEAD
<command>sleep 100 | echo 'Hello, I am going to sleep for 100s!'</command>
=======
<command>echo 'Hello World'</command>
>>>>>>> 7e20056... Add createJob method
</hudson.tasks.Shell>
</builders>
<publishers/>
<buildWrappers/>
<<<<<<< HEAD
</project>`;
=======
</project>
`;

/**
 * Stub for Readable wrapper
 * @method ReadableMock
 */
function ReadableMock() {}
/**
 * Stub for circuit-fuses wrapper
 * @method BreakerMock
 */
function BreakerMock() {}
<<<<<<< HEAD
>>>>>>> 7e20056... Add createJob method
=======
//
// function ExecutorFactoryMock() {}
>>>>>>> 0840acd... add createJob unit test

describe('index', () => {
    let executor;
    let Executor;
    let fsMock;
<<<<<<< HEAD
<<<<<<< HEAD
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
=======
=======
    let pathMock;
<<<<<<< HEAD
>>>>>>> 7e20056... Add createJob method
    let executor;
=======
>>>>>>> 0840acd... add createJob unit test
    let readableMock;
    let breakRunMock;
=======
describe('index', () => {
    let executor;
    let Executor;
    let requestMock;
>>>>>>> 81e72f3... add stop and stream methods
    let getCrumbMock;
    let jenkinsClientMock;
    let initJenkinsClientMock;
    let readConfigAndCreateJobMock;
<<<<<<< HEAD
    const testScmUrl = 'git@github.com:screwdriver-cd/hashr.git';
    const testBuildId = 'build_ad11234tag41fda';
    const testJobId = 'job_ad11234tag41fda';
    const testPipelineId = 'pipeline_ad11234tag41fda';
    const fakeResponse = {
        statusCode: 201,
>>>>>>> 14a281d... add getCrumb as Jenkins need it
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
<<<<<<< HEAD

    const buildNumber = fakeJobInfo.lastBuild.number;

    const jobName = config.buildId;
=======
=======
    let stopCurrentBuildMock;
    let getBuildLogMock;

>>>>>>> 81e72f3... add stop and stream methods
    const fakeCrumb = {
        statusCode: 200,
        body: {
            _class: 'hudson.security.csrf.DefaultCrumbIssuer',
            crumb: '24e80888069a1beaa5af3e0e3ef201d0',
            crumbRequestField: 'Jenkins-Crumb'
        }
    };
<<<<<<< HEAD
    const crumbUrl = 'https://admin:fakepassword@jenkins:8080/crumbIssuer/api/json';
    const jobsUrl = 'https://jenkins/apis/batch/v1/namespaces/default/jobs';
    const podsUrl = 'https://jenkins/api/v1/namespaces/default/pods';
>>>>>>> 14a281d... add getCrumb as Jenkins need it
=======

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
>>>>>>> 81e72f3... add stop and stream methods

    before(() => {
        mockery.enable({
            useCleanCache: true,
            warnOnUnregistered: false
        });
    });

    beforeEach(() => {
<<<<<<< HEAD
<<<<<<< HEAD
=======
        // requestMock = {
        //     post: sinon.stub(),
        //     get: sinon.stub()
        // };

=======
>>>>>>> 0840acd... add createJob unit test
        requestMock = sinon.stub();

<<<<<<< HEAD
>>>>>>> c26b951... add getCrumb
        fsMock = {
            readFileSync: sinon.stub()
        };

<<<<<<< HEAD
        jenkinsMock = sinon.stub();
=======
        pathMock = {
            resolve: sinon.stub()
        };

        readableMock = {
            wrap: sinon.stub()
        };
>>>>>>> 7e20056... Add createJob method

<<<<<<< HEAD
        requestMock = sinon.stub();
=======
        breakRunMock = sinon.stub();
<<<<<<< HEAD
//        getCrumbMock = sinon.stub();
>>>>>>> c26b951... add getCrumb

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

        fsMock.readFileSync.returns(TEST_XML);
=======

=======
>>>>>>> 81e72f3... add stop and stream methods
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

<<<<<<< HEAD
        getCrumbMock = sinon.stub();

        jenkinsMock = sinon.stub();

        initJenkinsClientMock = sinon.stub();

        readConfigAndCreateJobMock = sinon.stub();

        BreakerMock.prototype.runCommand = breakRunMock;
        ReadableMock.prototype.wrap = readableMock.wrap;

        fsMock.readFileSync.yieldsAsync(null, TEST_XML);
        pathMock.resolve.returns(null);
>>>>>>> 7e20056... Add createJob method

        mockery.registerMock('fs', fsMock);
<<<<<<< HEAD
        mockery.registerMock('jenkins', jenkinsMock);
        mockery.registerMock('request', requestMock);
=======
        mockery.registerMock('path', pathMock);
        mockery.registerMock('request', requestMock);
        mockery.registerMock('circuit-fuses', BreakerMock);
<<<<<<< HEAD
        mockery.registerMock('jenkins', jenkinInitMock);
>>>>>>> 7e20056... Add createJob method
=======
        mockery.registerMock('jenkins', jenkinsMock);
>>>>>>> 0840acd... add createJob unit test
=======
        mockery.registerMock('request', requestMock);
>>>>>>> 81e72f3... add stop and stream methods

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
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
        assert.isFunction(executor.stream);
        assert.isFunction(executor.stop);
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
=======
        assert.isFunction(executor.getCrumb);
=======
>>>>>>> 7e20056... Add createJob method
=======
        assert.isFunction(executor.getCrumb);
        assert.isFunction(executor.createJob);
>>>>>>> 0840acd... add createJob unit test
=======
        assert.isFunction(executor.stream);
        assert.isFunction(executor.stop);
>>>>>>> 81e72f3... add stop and stream methods
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

<<<<<<< HEAD
    describe('start', () => {
        beforeEach(() => {
            breakRunMock.yieldsAsync(null, fakeResponse, fakeResponse.body);
>>>>>>> 14a281d... add getCrumb as Jenkins need it
        });

        it('return error when jenkins() fails to instantiate a jenkins client', (done) => {
            const error = new Error('Failed to instantiate jenkins client');

            jenkinsMock.returns(null);

            executor.initJenkinsClient(JSON.stringify(fakeCrumb.body), (err) => {
                assert.deepEqual(err.message, error.message);
                done();
            });
        });
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
=======
        it('return error when getCrumbs is getting error', (done) => {
            const error = new Error('getCrumb error');

            getCrumbMock.yieldsAsync(error);
            initJenkinsClientMock.yieldsAsync(null, null);
            stopCurrentBuildMock.yieldsAsync(null);

            executor.stop(buildIdConfig, (err) => {
                assert.deepEqual(err, error);
>>>>>>> 81e72f3... add stop and stream methods
                done();
            });
        });

<<<<<<< HEAD
        it('return error when request responds with error', (done) => {
            const error = new Error('T_T');

            requestMock.yieldsAsync(error);

            executor.getCrumb((err) => {
=======
        it('return error when initJenkinsClient is getting error', (done) => {
            const error = new Error('initJenkinsClient error');

            getCrumbMock.yieldsAsync(null, fakeCrumb.body);
            initJenkinsClientMock.yieldsAsync(error);
            stopCurrentBuildMock.yieldsAsync(null);

            executor.stop(buildIdConfig, (err) => {
>>>>>>> 81e72f3... add stop and stream methods
                assert.deepEqual(err, error);
                done();
            });
        });

<<<<<<< HEAD
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
=======
        it('return error when stopCurrentBuild is getting error', (done) => {
            const error = new Error('stopCurrentBuild error');

            getCrumbMock.yieldsAsync(null, fakeCrumb.body);
            initJenkinsClientMock.yieldsAsync(null, jenkinsClientMock);
            stopCurrentBuildMock.yieldsAsync(error);

            executor.stop(buildIdConfig, (err) => {
                assert.deepEqual(err, error);
>>>>>>> 81e72f3... add stop and stream methods
                done();
            });
        });
    });

<<<<<<< HEAD
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

        it('return error when jenkinsClientMock.job.get is getting error', (done) => {
            const error = new Error('jenkinsClientMock.job.get error');

            jenkinsClientMock.job.get.yieldsAsync(error);

            executor.getBuildNumber(jobName, jenkinsClientMock,
                 (err) => {
                     assert.deepEqual(err, error);
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
                assert.calledOnce(fsMock.readFileSync);
                assert.calledOnce(jenkinsClientMock.job.create);
                assert.calledWith(jenkinsClientMock.job.create, jobName, TEST_XML);
                assert.calledOnce(jenkinsClientMock.job.build);
                assert.calledWith(jenkinsClientMock.job.build, jobName);
=======
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
>>>>>>> 81e72f3... add stop and stream methods
                done();
            });
        });

        it('return error when getCrumbs is getting error', (done) => {
            const error = new Error('getCrumb error');

            getCrumbMock.yieldsAsync(error);
<<<<<<< HEAD
            initJenkinsClientMock.yieldsAsync(null);
            jenkinsClientMock.job.create.yieldsAsync(null);
            jenkinsClientMock.job.build.yieldsAsync(null);

            executor.start(config, (err) => {
=======
            initJenkinsClientMock.yieldsAsync(null, null);
            getBuildLogMock.yieldsAsync(null);

            executor.stream(buildIdConfig, (err) => {
>>>>>>> 81e72f3... add stop and stream methods
                assert.deepEqual(err, error);
                done();
            });
        });

        it('return error when initJenkinsClient is getting error', (done) => {
            const error = new Error('initJenkinsClient error');
<<<<<<< HEAD

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

=======

            getCrumbMock.yieldsAsync(null, fakeCrumb.body);
            initJenkinsClientMock.yieldsAsync(error);
            getBuildLogMock.yieldsAsync(null);

>>>>>>> 81e72f3... add stop and stream methods
            executor.stream(buildIdConfig, (err) => {
                assert.deepEqual(err, error);
                done();
            });
        });

<<<<<<< HEAD
        it('return error when jenkinsClientMock.build.log is getting error', (done) => {
            const error = new Error('jenkinsClientMock.job.log error');

            getCrumbMock.yieldsAsync(null, fakeCrumb.body);
            initJenkinsClientMock.yieldsAsync(null, jenkinsClientMock);
            getBuildNumberMock.yieldsAsync(null, jenkinsClientMock, buildNumber);
            jenkinsClientMock.build.log.yieldsAsync(error);
=======
        it('return error when getBuildLog is getting error', (done) => {
            const error = new Error('getBuildLog error');

            getCrumbMock.yieldsAsync(null, fakeCrumb.body);
            initJenkinsClientMock.yieldsAsync(null, jenkinsClientMock);
            getBuildLogMock.yieldsAsync(error);
>>>>>>> 81e72f3... add stop and stream methods

            executor.stream(buildIdConfig, (err) => {
                assert.deepEqual(err, error);
                done();
            });
        });
    });
});
