#!/bin/sh

until nc -z test-ibm-db2-e2e-testing 50000; do
    echo "$(date) - waiting for DB2..."
    sleep 1
done

echo "DB2 is up and running. Waiting for 35 seconds to make sure everything is ready..."
sleep 35

echo "Probably DB2 is ready. Starting the application..."
exec yarn start:dev
