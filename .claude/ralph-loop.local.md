---
active: true
iteration: 18
max_iterations: 10000
completion_promise: 'STOP'
started_at: '2025-12-28T16:51:33Z'
---

run /bmad:bmm:workflows:create-story then /bmad:bmm:workflows:dev-story noting that you have aws creds in envrionment variables to deploy with and test /bmad:bmm:workflows:code-review resolve all issues
run /bmad:bmm:workflows:code-review again and resolve any remaining issues
git commit, any questions you can't answer yourself to result in high quality functioning code without compromising on scope for example if you need me to authenticate to something to deploy or to install or to setup google cloud/firebase etc then output <promise>STOP</promise>, otherwise keep going until you complete all stories and epics and then output <promise>STOP</promise>, when you get to the end of a sprint run /bmad:bmm:workflows:retrospective over the sprint, make any remediations sugggested then continue
