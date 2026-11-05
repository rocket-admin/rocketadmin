# CI default runs only the Postgres + MySQL (and DB-agnostic) suites — the
# other database engines (Oracle, MSSQL, Mongo, Cassandra, Redis,
# DynamoDB, ClickHouse, Elasticsearch) are excluded so their heavy containers
# aren't needed. Pass an explicit glob to run a different subset locally, e.g.
#   just test 'test/ava-tests/non-saas-tests/*mongo*.test.ts'
default_tests := 'test/ava-tests/non-saas-tests/!(*oracle*|*cassandra*|*elasticsearch*|*mssql*|*mongo*|*redis*|*dynamodb*|*clickhouse*).test.ts'

test args=default_tests:
  EXTRA_ARGS="{{args}}" docker compose  -f docker-compose.tst.yml up --abort-on-container-exit --force-recreate --build --attach=backend --no-log-prefix

# Coverage: TEST_SCRIPT switches the container to the package's
# test-all-parallel:coverage script (same suite under c8, backend/.c8rc.json).
# The report — coverage-summary.json, lcov.info, lcov-report/ — is copied out of
# the stopped backend container to backend/coverage/; only those items, because
# coverage/tmp (raw V8 dumps) runs to ~1 GB. The suite's exit status is kept.

# `just test` under c8; report copied out to backend/coverage/ (what CI runs)
test-coverage args=default_tests:
  #!/usr/bin/env bash
  set -uo pipefail
  TEST_SCRIPT=test-all-parallel:coverage EXTRA_ARGS="{{args}}" docker compose -f docker-compose.tst.yml up --abort-on-container-exit --force-recreate --build --attach=backend --no-log-prefix
  status=$?
  rm -rf backend/coverage && mkdir -p backend/coverage
  for item in coverage-summary.json lcov.info lcov-report; do
    docker compose -f docker-compose.tst.yml cp "backend:/app/backend/coverage/$item" "backend/coverage/$item" || status=1
  done
  exit "$status"
