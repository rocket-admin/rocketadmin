#!/bin/bash
echo "Waiting for Cassandra to start..."
until cqlsh test-cassandra-e2e-testing -u cassandra -p cassandra -e "describe keyspaces" >/dev/null 2>&1; do
  echo "Cassandra is unavailable - sleeping"
  sleep 5
done

echo "Cassandra is up - initializing..."

# Create the testdb keyspace if it doesn't exist
cqlsh test-cassandra-e2e-testing -u cassandra -p cassandra -e "CREATE KEYSPACE IF NOT EXISTS testdb WITH REPLICATION = {'class' : 'SimpleStrategy', 'replication_factor' : 1};"

echo "Cassandra initialization completed - testdb keyspace created"
