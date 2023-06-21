test:
	docker compose -f docker-compose.yml -f docker-compose.extra-test.yml up --abort-on-container-exit --force-recreate --build
