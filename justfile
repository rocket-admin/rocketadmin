test args='test/ava-tests/non-saas-tests/*':
  EXTRA_ARGS="{{args}}" docker compose  -f docker-compose.tst.yml up --abort-on-container-exit --force-recreate --build --attach=backend_test --no-log-prefix
