# Screwdriver Jenkins Executor

This executor plugin extends the [executor-base-class], and provides methods to start jobs from Jenkins

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
| config.jobId | String | The unique ID for a job |
| config.pipelineId | String | The unique ID for a pipeline |
| config.container | String | Container for the build to run in |
| config.scmUrl | String | The scmUrl to checkout |
| callback | Function | Callback `fn(err)` for when job has been created |

The `start` function will start a job in Jenkins with labels for easy lookup. These labels are:
* sdbuild: config.buildId
* sdjob: config.jobId
* sdpipeline: config.pipelineId

The job runs two containers:
* Runs the [screwdriver job-tools] container, sharing the files in `/opt/screwdriver`
* Runs the specified container (As of 7/21, only runs `node:4`), which runs `/opt/screwdriver/launch` with the required parameters

The callback is called with:
* An error `callback(err)` when an error occurs starting the job
* null `callback(null)` when a job is correctly started

## Testing

```bash
npm test
```

## License

Code licensed under the BSD 3-Clause license. See LICENSE file for terms.

[executor-base-class]: https://github.com/screwdriver-cd/executor-base
[screwdriver job-tools]: https://github.com/screwdriver-cd/job-tools
