'use strict';
/* eslint-disable no-underscore-dangle */
const Executor = require('./index');

const executor = new Executor({
    host: 'builder28.mail.corp.gq1.yahoo.com',
    username: 'admin',
    password: '6ed43e5f23ce40dc8b3793c062d0f5bd'
});

executor.start({
    buildId: '4b8d9b530d2e5e297b4f470d5b0a6e1310d29c5d',
    jobId: '50dc14f719cdc2c9cb1fb0e49dd2acc4cf6189a0',
    pipelineId: 'ccc49349d3cffbd12ea9e3d41521480b4aa5de5f',
    container: 'node:4',
    scmUrl: 'git@github.com:screwdriver-cd/data-model.git#master'
}, (err) => {
    if (err) {
        console.log(err);
    }
    setTimeout(() => {
        executor.stop({
            buildId: '4b8d9b530d2e5e297b4f470d5b0a6e1310d29c5d'
        }, (error) => {
            if (error) {
                console.log(error);
            }

            executor.stream({
                buildId: '4b8d9b530d2e5e297b4f470d5b0a6e1310d29c5d'
            }, (e, log) => {
                if (e) {
                    console.log('error in stream:', e);
                }

                console.log(log);
            });
        });
    }, 10000);
});
