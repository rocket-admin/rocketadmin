test:
	docker compose -f docker-compose.yml -f docker-compose.tst.yml up --abort-on-container-exit --force-recreate --build
