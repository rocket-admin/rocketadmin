#!/bin/bash
node --enable-source-maps dist/src/main.js &
nginx -g "daemon off;" &
wait -n
exit $?
