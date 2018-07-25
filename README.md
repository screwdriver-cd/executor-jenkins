# Screwdriver Jenkins Executor
[![Version][npm-image]][npm-url] ![Downloads][downloads-image] [![Build Status][status-image]][status-url] [![Open Issues][issues-image]][issues-url] [![Dependency Status][daviddm-image]][daviddm-url] ![License][license-image]

> Jenkins Executor Plugin for Screwdriver

## Usage

```bash
npm install screwdriver-executor-jenkins
```

### Configure
The class provides a couple options that are configurable in the instantiation of this Executor

| Parameter        | Type  | Default    | Description |
| :-------------   | :---- | :----------| :-----------|
| config        | Object | | Configuration Object |
| config.ecosystem | Object | | Screwdriver Ecosystem (ui, api, store, etc.) |
| config.jenkins.username | String | 'screwdriver' | The username for the Jenkins cluster  |
| config.jenkins.password | String | | The password or token for the Jenkins cluster  |
| config.jenkins.host | String | | The hostname for the Jenkins cluster |
| config.jenkins.port | Number | 8080 | The port number for the Jenkins cluster |
| config.jenkins.nodeLabel | String | 'screwdriver' | Node labels of Jenkins slaves |
| config.jenkins.buildTimeout | Number | 90 | Number of minutes to allow a build to run before considering it is timed out |
| config.jenkins.maxBuildTimeout | Number | 120 | Max timeout user can configure up to |
| config.docker.composeCommand | String | 'docker'-compose | The path to the docker-compose command |
| config.docker.launchVersion | String | 'stable' | Launcher container version to use |
| config.docker.prefix | String | '' | Prefix to container names |
| config.docker.memory | String | '4g' | Memory limit (docker run `--memory` option) |
| config.docker.memoryLimit | String | '6g' | Memory limit include swap (docker run `--memory-swap` option) |
| config.buildScript | String | | Shell script to start the job |
| config.cleanupScript | String | '' | Shell script to clean up the job |
| config.cleanupTimeLimit | Number | 20 | Time to stop the job (seconds) |
| config.cleanupWatchInterval | Number | 2 | Interval to detect the stopped job (seconds) |

If `config.buildScript` is provided, the executor run the command instead of docker. You are responsible for deploying launcher in slave machines or VM.

### Requirements

#### Jenkins

- [Post build task plugin](https://wiki.jenkins.io/display/JENKINS/Post+build+task)

#### Slave machine

- [Docker](https://www.docker.com/)
- [Docker Compose](https://docs.docker.com/compose/)

### Methods

For more information on `start`, `stop`, and `stats` please see the [executor-base-class].

## Testing

```bash
npm test
```

## License

Code licensed under the BSD 3-Clause license. See LICENSE file for terms.

[npm-image]: https://img.shields.io/npm/v/screwdriver-executor-jenkins.svg
[npm-url]: https://npmjs.org/package/screwdriver-executor-jenkins
[downloads-image]: https://img.shields.io/npm/dt/screwdriver-executor-jenkins.svg
[license-image]: https://img.shields.io/npm/l/screwdriver-executor-jenkins.svg
[issues-image]: https://img.shields.io/github/issues/screwdriver-cd/screwdriver.svg
[issues-url]: https://github.com/screwdriver-cd/screwdriver/issues
[status-image]: https://cd.screwdriver.cd/pipelines/19/badge
[status-url]: https://cd.screwdriver.cd/pipelines/19
[daviddm-image]: https://david-dm.org/screwdriver-cd/executor-j5s.svg?theme=shields.io
[daviddm-url]: https://david-dm.org/screwdriver-cd/executor-j5s
[executor-base-class]: https://github.com/screwdriver-cd/executor-base
[screwdriver job-tools]: https://github.com/screwdriver-cd/job-tools
