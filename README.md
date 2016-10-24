# Screwdriver Jenkins Executor
[![Version][npm-image]][npm-url] ![Downloads][downloads-image] [![Build Status][status-image]][status-url] [![Open Issues][issues-image]][issues-url] [![Dependency Status][daviddm-image]][daviddm-url] ![License][license-image]

> This executor plugin extends the [executor-base-class], and provides methods to start jobs from Jenkins

## Usage

```bash
npm install screwdriver-executor-j5s
```

### Configure
The class provides a couple options that are configurable in the instantiation of this Executor

| Parameter        | Type  |  Description |
| :-------------   | :---- | :-------------|
| config        | Object | Configuration Object |
| config.username | String | The username for Jenkins cluster  |
| config.password | String | The password or token for Jenkins cluster  |
| config.host | String | The hostname for the Jenkins cluster |

### Start
The `start` method takes advantage of the input validation defined in the [executor-base-class].

The parameters required are:

| Parameter        | Type  |  Description |
| :-------------   | :---- | :-------------|
| config        | Object | Configuration Object |
| config.buildId | String | The unique ID for a build |
| config.container | String | Container for the build to run in |
| config.apiUri | String | Screwdriver's API |
| config.token | String | JWT to act on behalf of the build |
| callback | Function | Callback `fn(err)` for when job has been created |

The `start` function will start a job in Jenkins with labels for easy lookup. These labels are:
* sdbuild: config.buildId

The job runs two containers:
* Runs the [screwdriver job-tools] container, sharing the files in `/opt/screwdriver`
* Runs the specified container, which runs `/opt/screwdriver/launch` with the required parameters

The callback is called with:
* An error `callback(err)` when an error occurs starting the job
* null `callback(null)` when a job is correctly started

### Stop
The parameters required are:

| Parameter        | Type  |  Description |
| :-------------   | :---- | :-------------|
| config        | Object | Configuration Object |
| config.buildId | String | The unique ID for a build to be stopped|
| callback | Function | Callback `fn(err)` for when the build has been stopped |

The `stop` function will stop last build of the job with the `buildId` tag in jenkins.

The callback is called with:
* An error `callback(err)` when an error occurs stopping the job
* null `callback(null)` when a job is correctly stopped

## Testing

```bash
npm test
```

## License

Code licensed under the BSD 3-Clause license. See LICENSE file for terms.

[npm-image]: https://img.shields.io/npm/v/screwdriver-executor-j5s.svg
[npm-url]: https://npmjs.org/package/screwdriver-executor-j5s
[downloads-image]: https://img.shields.io/npm/dt/screwdriver-executor-j5s.svg
[license-image]: https://img.shields.io/npm/l/screwdriver-executor-j5s.svg
[issues-image]: https://img.shields.io/github/issues/screwdriver-cd/executor-j5s.svg
[issues-url]: https://github.com/screwdriver-cd/executor-j5s/issues
[status-image]: https://cd.screwdriver.cd/pipelines/b65e77e258e36b1826390131ccaafcbed5f7acb8/badge
[status-url]: https://cd.screwdriver.cd/pipelines/b65e77e258e36b1826390131ccaafcbed5f7acb8
[daviddm-image]: https://david-dm.org/screwdriver-cd/executor-j5s.svg?theme=shields.io
[daviddm-url]: https://david-dm.org/screwdriver-cd/executor-j5s
[executor-base-class]: https://github.com/screwdriver-cd/executor-base
[screwdriver job-tools]: https://github.com/screwdriver-cd/job-tools
