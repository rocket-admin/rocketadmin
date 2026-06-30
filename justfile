# CI default runs only the Postgres + MySQL (and DB-agnostic) suites — the
# other database engines (Oracle, MSSQL, Mongo, IBM DB2, Cassandra, Redis,
# DynamoDB, ClickHouse, Elasticsearch) are excluded so their heavy containers
# aren't needed. Pass an explicit glob to run a different subset locally, e.g.
#   just test 'test/ava-tests/non-saas-tests/*mongo*.test.ts'
test args='test/ava-tests/non-saas-tests/!(*oracle*|*ibmdb2*|*cassandra*|*elasticsearch*|*mssql*|*mongo*|*redis*|*dynamodb*|*clickhouse*).test.ts':
  EXTRA_ARGS="{{args}}" docker compose  -f docker-compose.tst.yml up --abort-on-container-exit --force-recreate --build --attach=backend --no-log-prefix
