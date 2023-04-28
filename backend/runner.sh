#!/bin/bash
node --enable-source-maps dist/main.js &
nginx -g "daemon off;" &
wait -n
exit $?
