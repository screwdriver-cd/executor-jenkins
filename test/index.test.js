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
<command>echo 'Hello World'</command>
</hudson.tasks.Shell>
</builders>
<publishers/>
<buildWrappers/>
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
//
// function ExecutorFactoryMock() {}

describe('index', () => {
    let executor;
    let Executor;
    let requestMock;
    let fsMock;
    let pathMock;
    let readableMock;
    let breakRunMock;
    let getCrumbMock;
    let jenkinsMock;
    let jenkinsClientMock;
    let initJenkinsClientMock;
    let readConfigAndCreateJobMock;
    const testScmUrl = 'git@github.com:screwdriver-cd/hashr.git';
    const testBuildId = 'build_ad11234tag41fda';
    const testJobId = 'job_ad11234tag41fda';
    const testPipelineId = 'pipeline_ad11234tag41fda';
    const fakeResponse = {
        statusCode: 201,
        body: {
            success: true
        }
    };
    const fakeCrumb = {
        statusCode: 200,
        body: {
            _class: 'hudson.security.csrf.DefaultCrumbIssuer',
            crumb: '24e80888069a1beaa5af3e0e3ef201d0',
            crumbRequestField: 'Jenkins-Crumb'
        }
    };
    const crumbUrl = 'https://admin:fakepassword@jenkins:8080/crumbIssuer/api/json';
    const jobsUrl = 'https://jenkins/apis/batch/v1/namespaces/default/jobs';
    const podsUrl = 'https://jenkins/api/v1/namespaces/default/pods';

    before(() => {
        mockery.enable({
            useCleanCache: true,
            warnOnUnregistered: false
        });
    });

    beforeEach(() => {
        requestMock = sinon.stub();

        fsMock = {
            readFileSync: sinon.stub()
        };

        pathMock = {
            resolve: sinon.stub()
        };

        readableMock = {
            wrap: sinon.stub()
        };

        breakRunMock = sinon.stub();

        jenkinsClientMock = {
            job: {
                create: sinon.stub()
            }
        };

        getCrumbMock = sinon.stub();

        jenkinsMock = sinon.stub();

        initJenkinsClientMock = sinon.stub();

        readConfigAndCreateJobMock = sinon.stub();

        BreakerMock.prototype.runCommand = breakRunMock;
        ReadableMock.prototype.wrap = readableMock.wrap;

        fsMock.readFileSync.yieldsAsync(null, TEST_XML);
        pathMock.resolve.returns(null);

        mockery.registerMock('stream', {
            Readable: ReadableMock
        });
        mockery.registerMock('fs', fsMock);
        mockery.registerMock('path', pathMock);
        mockery.registerMock('request', requestMock);
        mockery.registerMock('circuit-fuses', BreakerMock);
        mockery.registerMock('jenkins', jenkinsMock);

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
        assert.isFunction(executor.start);
        assert.isFunction(executor.getCrumb);
        assert.isFunction(executor.createJob);
    });

    describe('getCrumb', () => {
        it('with correct url', (done) => {
            requestMock.yieldsAsync(null, fakeCrumb);
            const crumbConfig = {
                url: crumbUrl,
                method: 'GET'
            };

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
            requestMock.yieldsAsync(null, {
                statusCode: 201,
                body: {
                    any: 'thing'
                }
            });

            executor.getCrumb((err, response) => {
                assert.deepEqual(err.message, 'Failed to get crumb: {"any":"thing"}');
                assert.isNotOk(response);
                done();
            });
        });
    });

    describe('createJob', () => {
        beforeEach(() => {
            getCrumbMock = sinon.stub(executor, 'getCrumb');
            initJenkinsClientMock = sinon.stub(executor, 'initJenkinsClient');
            readConfigAndCreateJobMock = sinon.stub(executor, 'readConfigAndCreateJob');
        });

        it('return null when the job is successfully created', (done) => {
            getCrumbMock.yieldsAsync(null, fakeCrumb.body);
            initJenkinsClientMock.yieldsAsync(null, jenkinsClientMock);
            readConfigAndCreateJobMock.yieldsAsync(null);

            executor.createJob((err) => {
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

            executor.createJob((err) => {
                assert.deepEqual(err.message, error.message);
                done();
            });
        });

        it('return error when initJenkinsClient is getting error', (done) => {
            const error = new Error('initJenkinsClient error');

            getCrumbMock.yieldsAsync(null, fakeCrumb.body);
            initJenkinsClientMock.yieldsAsync(error);
            readConfigAndCreateJobMock.yieldsAsync(null);

            executor.createJob((err) => {
                assert.deepEqual(err.message, error.message);
                done();
            });
        });

        it.only('return error when readConfigAndCreateJob is getting error', (done) => {
            const error = new Error('readConfigAndCreateJob error');

            getCrumbMock.yieldsAsync(null, fakeCrumb.body);
            initJenkinsClientMock.yieldsAsync(null, jenkinsClientMock);
            readConfigAndCreateJobMock.yieldsAsync(error);

            executor.createJob((err) => {
                assert.deepEqual(err.message, error.message);
                done();
            });
        });

        it('return error when request responds with non 200 status code', (done) => {
            requestMock.yieldsAsync(null, {
                statusCode: 201,
                body: {
                    any: 'thing'
                }
            });

            executor.getCrumb((err, response) => {
                assert.deepEqual(err.message, 'Failed to get crumb: {"any":"thing"}');
                assert.isNotOk(response);
                done();
            });
        });
    });

    describe('start', () => {
        beforeEach(() => {
            breakRunMock.yieldsAsync(null, fakeResponse, fakeResponse.body);
        });

        describe('successful requests', () => {
            it('with scmUrl containing branch', (done) => {
                const postConfig = {
                    uri: jobsUrl,
                    method: 'POST',
                    json: {
                        metadata: {
                            name: testBuildId,
                            job: testJobId,
                            pipeline: testPipelineId
                        },
                        command: ['/opt/screwdriver/launch screwdriver-cd hashr addSD main']
                    },
                    headers: {
                        Authorization: 'Bearer api_key'
                    },
                    strictSSL: false
                };

                executor.start({
                    scmUrl: 'git@github.com:screwdriver-cd/hashr.git#addSD',
                    buildId: testBuildId,
                    jobId: testJobId,
                    pipelineId: testPipelineId,
                    container: 'container'
                }, (err) => {
                    assert.isNull(err);
                    assert.calledOnce(breakRunMock);
                    assert.calledWith(breakRunMock, postConfig);
                    done();
                });
            });

            it('with scmUrl without branch', (done) => {
                const postConfig = {
                    uri: jobsUrl,
                    method: 'POST',
                    json: {
                        metadata: {
                            name: testBuildId,
                            job: testJobId,
                            pipeline: testPipelineId
                        },
                        command: ['/opt/screwdriver/launch screwdriver-cd hashr master main']
                    },
                    headers: {
                        Authorization: 'Bearer api_key'
                    },
                    strictSSL: false
                };

                executor.start({
                    scmUrl: testScmUrl,
                    buildId: testBuildId,
                    jobId: testJobId,
                    pipelineId: testPipelineId,
                    container: 'container'
                }, (err) => {
                    assert.isNull(err);
                    assert.calledOnce(breakRunMock);
                    assert.calledWith(breakRunMock, postConfig);
                    done();
                });
            });
        });

        it('returns error when request responds with error', (done) => {
            const error = new Error('lol');

            breakRunMock.yieldsAsync(error);

            executor.start({
                scmUrl: testScmUrl,
                buildId: testBuildId,
                jobId: testJobId,
                pipelineId: testPipelineId,
                container: 'container'
            }, (err) => {
                assert.deepEqual(err, error);
                done();
            });
        });

        it('returns body when request responds with error in response', (done) => {
            const returnResponse = {
                statusCode: 500,
                body: {
                    statusCode: 500,
                    message: 'lol'
                }
            };
            const returnMessage = `Failed to create job: ${JSON.stringify(returnResponse.body)}`;

            breakRunMock.yieldsAsync(null, returnResponse);

            executor.start({
                scmUrl: testScmUrl,
                buildId: testBuildId,
                jobId: testJobId,
                pipelineId: testPipelineId,
                container: 'container'
            }, (err, response) => {
                assert.notOk(response);
                assert.equal(err.message, returnMessage);
                done();
            });
        });
    });

    describe('stream', () => {
        const pod = `${podsUrl}?labelSelector=sdbuild=${testBuildId}`;
        const logUrl = `${podsUrl}/mypod/log?container=build&follow=true&pretty=true`;

        it('reply with error when it fails to get pod', (done) => {
            const error = new Error('lol');

            breakRunMock.yieldsAsync(error);
            executor.stream({
                buildId: testBuildId
            }, (err) => {
                assert.isOk(err);
                done();
            });
        });

        it('reply with error when podname is not found', (done) => {
            const returnResponse = {
                statusCode: 200,
                body: {
                    items: []
                }
            };

            breakRunMock.yieldsAsync(null, returnResponse);
            executor.stream({
                buildId: testBuildId
            }, (err) => {
                assert.isOk(err);
                done();
            });
        });

        it('stream logs when podname is found', (done) => {
            const getConfig = {
                url: pod,
                json: true,
                headers: {
                    Authorization: 'Bearer api_key'
                },
                strictSSL: false
            };
            const logConfig = {
                url: logUrl,
                headers: {
                    Authorization: 'Bearer api_key'
                },
                strictSSL: false
            };
            const returnResponse = {
                statusCode: 200,
                body: {
                    items: [{
                        metadata: {
                            name: 'mypod'
                        }
                    }]
                }
            };
            const logGetMock = {
                mock: 'thing'
            };
            const readWrapMock = {
                mock: 'thing2'
            };

            breakRunMock.withArgs(getConfig)
                .yieldsAsync(null, returnResponse);
            requestMock.get.withArgs(logConfig).returns(logGetMock);
            readableMock.wrap.returns(readWrapMock);

            executor.stream({
                buildId: testBuildId
            }, (err, stream) => {
                assert.isNull(err);
                assert.calledOnce(breakRunMock);
                assert.calledOnce(requestMock.get);
                assert.calledWith(breakRunMock, getConfig);
                assert.calledWith(requestMock.get, logConfig);
                assert.calledWith(readableMock.wrap, logGetMock);
                assert.deepEqual(stream, readWrapMock);
                done();
            });
        });
    });
});
