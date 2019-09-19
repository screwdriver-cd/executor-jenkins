'use strict';

const { assert } = require('chai');
const sinon = require('sinon');
const mockery = require('mockery');
const tinytim = require('tinytim');
const xmlescape = require('xml-escape');

sinon.assert.expose(assert, { prefix: '' });

const TEST_JOB_XML = `
<?xml version="1.0" encoding="UTF-8"?>
<project>
    <assignedNode>{{nodeLabel}}</assignedNode>
    <builders>
        <hudson.tasks.Shell>
            <command>{{buildScript}}</command>
        </hudson.tasks.Shell>
    </builders>
    <publishers>
        <hudson.plugins.postbuildtask.PostbuildTask plugin="postbuild-task@1.8">
            <script>{{cleanupScript}}</script>
        </hudson.plugins.postbuildtask.PostbuildTask>
    </publishers>
</project>
`;

const CONFIGURED_BUILD_TIMEOUT = 45;
const DEFAULT_BUILD_TIMEOUT = 90;
const MAX_BUILD_TIMEOUT = 120;
const TEST_COMPOSE_YAML = `
version: '2'
services:
  launcher:
    image: screwdrivercd/launcher:{{launcher_version}}
    container_name: {{build_id_with_prefix}}-init
    labels:
      sdbuild: {{build_id_with_prefix}}
    volumes:
      - /opt/sd
    entrypoint: /bin/true
  build:
    image: {{base_image}}
    container_name: {{build_id_with_prefix}}-build
    volumes_from:
      - launcher:rw
    labels:
      sdbuild: {{build_id_with_prefix}}
    mem_limit: {{memory}}
    memswap_limit: {{memory_swap}}
    environment:
      SD_TOKEN:
    volumes_from:
      - launcher:rw
    entrypoint: /opt/sd/tini
    command:
      - "--"
      - "/bin/sh"
      - "-c"
      - |
          /opt/sd/run.sh "{{token}}" "{{api_uri}}" `
          + `"{{store_uri}}" "$SD_BUILD_TIMEOUT" "{{build_id}}" "{{ui_uri}}"
`;

describe('index', () => {
    let executor;
    let Executor;
    let jenkinsMock;
    let breakerMock;
    let BreakerFactory;
    let jobXml;
    let composeYml;

    const config = {
        buildId: 1993,
        container: 'node:4',
        apiUri: 'http://localhost:8080',
        token: 'abcdefg',
        annotations: {}
    };

    const jobName = `SD-${config.buildId}`;

    const nodeLabel = 'node-label-foo';

    const ecosystem = {
        api: 'api',
        ui: 'ui',
        store: 'store'
    };

    const buildParams = {
        SD_BUILD_ID: String(config.buildId),
        SD_TOKEN: config.token,
        SD_CONTAINER: config.container,
        SD_API: ecosystem.api,
        SD_STORE: ecosystem.store,
        SD_UI: ecosystem.ui,
        SD_BUILD_TIMEOUT: DEFAULT_BUILD_TIMEOUT
    };

    const maxTimeoutBuildParams = {
        ...buildParams,
        SD_BUILD_TIMEOUT: MAX_BUILD_TIMEOUT
    };

    const configuredTimeoutBuildParams = {
        ...buildParams,
        SD_BUILD_TIMEOUT: CONFIGURED_BUILD_TIMEOUT
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

    const cleanupWatchInterval = 0.01;

    before(() => {
        mockery.enable({
            useCleanCache: true,
            warnOnUnregistered: false
        });
    });

    beforeEach(() => {
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

        mockery.registerMock('circuit-fuses', { breaker: BreakerFactory });

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
            cleanupWatchInterval
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

    it('is secure properly', () => {
        assert.isUndefined(executor.password);
        assert.isUndefined(executor.baseUrl);
    });

    describe('start', () => {
        let createOpts;
        let configOpts;
        let existsOpts;
        let buildOpts;
        let configuredBuildTimeoutOpts;
        let maxBuildTimeoutOpts;
        const fakeXml = 'fake_xml';

        beforeEach(() => {
            createOpts = {
                module: 'job',
                action: 'create',
                params: [{ name: jobName, xml: fakeXml }]
            };

            configOpts = {
                module: 'job',
                action: 'config',
                params: [{ name: jobName, xml: fakeXml }]
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
                    parameters: buildParams
                }]
            };

            configuredBuildTimeoutOpts = {
                module: 'job',
                action: 'build',
                params: [{
                    name: jobName,
                    parameters: configuredTimeoutBuildParams
                }]
            };

            maxBuildTimeoutOpts = {
                module: 'job',
                action: 'build',
                params: [{
                    name: jobName,
                    parameters: maxTimeoutBuildParams
                }]
            };

            sinon.stub(executor, '_loadJobXml').returns(fakeXml);
            config.annotations = {};
        });

        it('return null when the job is successfully created', (done) => {
            breakerMock.runCommand.withArgs(existsOpts).resolves(false);

            executor.start(config).then(() => {
                assert.calledWith(breakerMock.runCommand, existsOpts);
                assert.calledWith(breakerMock.runCommand, createOpts);
                assert.calledWith(breakerMock.runCommand, buildOpts);
                done();
            });
        });

        it('update job when job already exists', (done) => {
            breakerMock.runCommand.withArgs(existsOpts).resolves(true);

            executor.start(config).then(() => {
                assert.calledWith(breakerMock.runCommand, existsOpts);
                assert.calledWith(breakerMock.runCommand, configOpts);
                assert.calledWith(breakerMock.runCommand, buildOpts);
                done();
            });
        });

        it('sets the build timeout if configured by user', (done) => {
            breakerMock.runCommand.withArgs(existsOpts).resolves(false);

            config.annotations = { 'beta.screwdriver.cd/timeout': CONFIGURED_BUILD_TIMEOUT };
            executor.start(config).then(() => {
                assert.calledWith(breakerMock.runCommand, existsOpts);
                assert.calledWith(breakerMock.runCommand, createOpts);
                assert.calledWith(breakerMock.runCommand, configuredBuildTimeoutOpts);
                done();
            });
        });

        it('sets the timeout to maxBuildTimeout if user specified a higher timeout', (done) => {
            breakerMock.runCommand.withArgs(existsOpts).resolves(false);

            config.annotations = { 'beta.screwdriver.cd/timeout': 220 };
            executor.start(config).then(() => {
                assert.calledWith(breakerMock.runCommand, existsOpts);
                assert.calledWith(breakerMock.runCommand, createOpts);
                assert.calledWith(breakerMock.runCommand, maxBuildTimeoutOpts);
                done();
            });
        });

        it('return error when job.create is getting error', (done) => {
            const error = new Error('job.create error');

            breakerMock.runCommand.withArgs(createOpts).rejects(error);

            executor.start(config).catch((err) => {
                assert.deepEqual(err, error);
                done();
            });
        });

        it('return error when job.build is getting error', (done) => {
            const error = new Error('job.build error');

            breakerMock.runCommand.withArgs(createOpts).resolves('ok');
            breakerMock.runCommand.withArgs(buildOpts).rejects(error);

            executor.start(config).catch((err) => {
                assert.deepEqual(err, error);
                done();
            });
        });

        it('return error when job.config is getting error', (done) => {
            const error = new Error('job.build error');

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

            executor.stop({ buildId: config.buildId }).then((ret) => {
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

            executor.stop({ buildId: config.buildId }).then((ret) => {
                assert.isNull(ret);
                assert.calledWith(breakerMock.runCommand, getOpts);
                assert.calledWith(breakerMock.runCommand, stopOpts);
                assert.calledWith(breakerMock.runCommand, destroyOpts);
                done();
            });
        });

        it('return error when the job not stopped until the timelimit', (done) => {
            executor.cleanupTimeLimit = 0.05;

            breakerMock.runCommand.withArgs(getOpts).resolves(fakeJobInfo);
            breakerMock.runCommand.withArgs(stopOpts).resolves(null);
            breakerMock.runCommand.withArgs(destroyOpts).resolves(null);

            executor.stop({ buildId: config.buildId }).catch((err) => {
                assert.deepEqual(err.message, 'Clean up timeout exceeded');
                assert.calledWith(breakerMock.runCommand, getOpts);
                assert.calledWith(breakerMock.runCommand, stopOpts);
                done();
            });
        });

        it('return error when there is no build to be stopped yet', (done) => {
            const noBuildJobInfo = {
                lastBuild: null
            };

            breakerMock.runCommand.withArgs(getOpts).resolves(noBuildJobInfo);
            breakerMock.runCommand.withArgs(stopOpts).resolves(null);

            executor.stop({ buildId: config.buildId }).catch((err) => {
                assert.deepEqual(err.message, 'No build has been started yet, try later');
                done();
            });
        });

        it('return error when job.get is getting error', (done) => {
            const error = new Error('job.get error');

            breakerMock.runCommand.withArgs(getOpts).rejects(error);
            breakerMock.runCommand.withArgs(stopOpts).resolves();

            executor.stop({ buildId: config.buildId }).catch((err) => {
                assert.deepEqual(err, error);
                done();
            });
        });

        it('return error when build.stop is getting error', (done) => {
            const error = new Error('build.stop error');

            breakerMock.runCommand.withArgs(getOpts).resolves(fakeJobInfo);
            breakerMock.runCommand.withArgs(stopOpts).rejects(error);

            executor.stop({ buildId: config.buildId }).catch((err) => {
                assert.deepEqual(err, error);
                done();
            });
        });

        it('return error when second job.get is getting error', (done) => {
            const error = new Error('job.get error');

            breakerMock.runCommand.withArgs(getOpts).onCall(0).resolves(fakeJobInfo);
            breakerMock.runCommand.withArgs(getOpts).onCall(1).rejects(error);
            breakerMock.runCommand.withArgs(stopOpts).resolves();

            executor.stop({ buildId: config.buildId }).catch((err) => {
                assert.deepEqual(err, error);
                done();
            });
        });
    });

    describe('periodic', () => {
        it('resolves to null when calling periodic start',
            () => executor.startPeriodic().then(res => assert.isNull(res)));

        it('resolves to null when calling periodic stop',
            () => executor.stopPeriodic().then(res => assert.isNull(res)));
    });

    describe('_loadJobXml', () => {
        let fsMock;

        beforeEach(() => {
            fsMock = {
                readFileSync: sinon.stub()
            };

            mockery.registerMock('fs', fsMock);

            fsMock.readFileSync.withArgs(sinon.match(/config\/job.xml.tim/))
                .returns(TEST_JOB_XML);
        });

        describe('use custom build script', () => {
            const buildScript = '/opt/bin/sd-build-test-<should-escape-xml>';
            const cleanupScript = '/opt/bin/sd-cleanup-test-<should-escape-xml>';

            beforeEach(() => {
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
            });

            it('return jenkins job xml correctly', () => {
                const xml = tinytim.render(TEST_JOB_XML, {
                    nodeLabel: xmlescape(nodeLabel),
                    buildScript: xmlescape(buildScript),
                    cleanupScript: xmlescape(cleanupScript)
                });

                const parsedAnnotations = {};

                assert.equal(executor._loadJobXml(config, parsedAnnotations), xml);
            });
        });

        describe('use docker-compose', () => {
            beforeEach(() => {
                fsMock.readFileSync.withArgs(sinon.match(/config\/docker-compose.yml.tim/))
                    .returns(TEST_COMPOSE_YAML);
            });

            it('use default options correctly', () => {
                composeYml = tinytim.render(TEST_COMPOSE_YAML, {
                    launcher_version: 'stable',
                    build_id: config.buildId,
                    build_id_with_prefix: `${config.buildId}`,
                    token: config.token,
                    base_image: config.container,
                    memory: '4g',
                    memory_swap: '6g',
                    api_uri: ecosystem.api,
                    store_uri: ecosystem.store,
                    ui_uri: ecosystem.ui
                });

                executor = new Executor({
                    ecosystem,
                    jenkins: {
                        host: 'jenkins',
                        username: 'admin',
                        password: 'fakepassword'
                    }
                });

                const buildScriptTim = `
set -eu
cat << 'EOL' > docker-compose.yml
{{composeYml}}
EOL

docker-compose pull
docker-compose up
`.trim();

                const cleanupScript = `
docker-compose rm -f -s
rm -f docker-compose.yml
`.trim();

                const buildScript = tinytim.render(buildScriptTim, {
                    composeYml
                });

                jobXml = tinytim.render(TEST_JOB_XML, {
                    nodeLabel: 'screwdriver',
                    buildScript: xmlescape(buildScript),
                    cleanupScript: xmlescape(cleanupScript)
                });

                const parsedAnnotations = {};

                assert.equal(executor._loadJobXml(config, parsedAnnotations), jobXml);
            });

            it('use provided options correctly without nodeLabel', () => {
                const composeCommand = 'fake-docker-compose';
                const prefix = 'foo-prefix';
                const launchVersion = 'foo-ver';
                const memory = '20g';
                const memoryLimit = '25g';

                const executorConfig = {
                    ecosystem,
                    jenkins: {
                        host: 'jenkins',
                        username: 'admin',
                        password: 'fakepassword',
                        nodeLabel
                    },
                    docker: {
                        composeCommand,
                        memory,
                        memoryLimit,
                        prefix,
                        launchVersion
                    }
                };

                executor = new Executor(executorConfig);

                composeYml = tinytim.render(TEST_COMPOSE_YAML, {
                    launcher_version: launchVersion,
                    build_id: config.buildId,
                    build_id_with_prefix: `${prefix}${config.buildId}`,
                    token: config.token,
                    base_image: config.container,
                    memory,
                    memory_swap: memoryLimit,
                    api_uri: ecosystem.api,
                    store_uri: ecosystem.store,
                    ui_uri: ecosystem.ui
                });

                const buildScriptTim = `
set -eu
cat << 'EOL' > docker-compose.yml
{{composeYml}}
EOL

${composeCommand} pull
${composeCommand} up
`.trim();

                const cleanupScript = `
${composeCommand} rm -f -s
rm -f docker-compose.yml
`.trim();

                const buildScript = tinytim.render(buildScriptTim, {
                    composeYml
                });

                jobXml = tinytim.render(TEST_JOB_XML, {
                    nodeLabel,
                    buildScript: xmlescape(buildScript),
                    cleanupScript: xmlescape(cleanupScript)
                });

                const parsedAnnotations = {};

                assert.equal(executor._loadJobXml(config, parsedAnnotations), jobXml);
            });

            it('use provided options correctly with nodeLabel', () => {
                const composeCommand = 'fake-docker-compose';
                const prefix = 'foo-prefix';
                const launchVersion = 'foo-ver';
                const memory = '20g';
                const memoryLimit = '25g';

                const executorConfig = {
                    ecosystem,
                    jenkins: {
                        host: 'jenkins',
                        username: 'admin',
                        password: 'fakepassword'
                    },
                    docker: {
                        composeCommand,
                        memory,
                        memoryLimit,
                        prefix,
                        launchVersion
                    }
                };

                executor = new Executor(executorConfig);

                composeYml = tinytim.render(TEST_COMPOSE_YAML, {
                    launcher_version: launchVersion,
                    build_id: config.buildId,
                    build_id_with_prefix: `${prefix}${config.buildId}`,
                    token: config.token,
                    base_image: config.container,
                    memory,
                    memory_swap: memoryLimit,
                    api_uri: ecosystem.api,
                    store_uri: ecosystem.store,
                    ui_uri: ecosystem.ui
                });

                const buildScriptTim = `
set -eu
cat << 'EOL' > docker-compose.yml
{{composeYml}}
EOL

${composeCommand} pull
${composeCommand} up
`.trim();

                const cleanupScript = `
${composeCommand} rm -f -s
rm -f docker-compose.yml
`.trim();

                const buildScript = tinytim.render(buildScriptTim, {
                    composeYml
                });

                const providedNodeLabel = 'foo-label';
                const parsedAnnotations = { nodeLabel: providedNodeLabel };

                jobXml = tinytim.render(TEST_JOB_XML, {
                    nodeLabel: `screwdriver-${providedNodeLabel}`,
                    buildScript: xmlescape(buildScript),
                    cleanupScript: xmlescape(cleanupScript)
                });

                assert.equal(executor._loadJobXml(config, parsedAnnotations), jobXml);
            });
        });
    });

    describe('run without Mocked Breaker', () => {
        const fakeXml = 'fake_xml';

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
                }
            });

            jenkinsMock.job.create = sinon.stub(executor.jenkinsClient.job, 'create');
            jenkinsMock.job.config = sinon.stub(executor.jenkinsClient.job, 'config');
            jenkinsMock.job.exists = sinon.stub(executor.jenkinsClient.job, 'exists');
            jenkinsMock.job.build = sinon.stub(executor.jenkinsClient.job, 'build');

            sinon.stub(executor, '_loadJobXml').returns(fakeXml);
        });

        it('calls jenkins function correctly', (done) => {
            jenkinsMock.job.exists.yieldsAsync(null, false);
            jenkinsMock.job.create.yieldsAsync(null);
            jenkinsMock.job.build.yieldsAsync(null);

            executor.start(config).then(() => {
                assert.calledWith(jenkinsMock.job.create, { name: jobName, xml: fakeXml });
                assert.calledWith(jenkinsMock.job.build,
                    { name: jobName, parameters: buildParams });
                done();
            });
        });
    });
});
