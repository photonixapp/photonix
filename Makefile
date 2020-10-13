start:
	docker-compose -f docker/docker-compose.prd.yml up

build:
	docker-compose -f docker/docker-compose.prd.yml build

start-dev:
	docker-compose -f docker/docker-compose.dev.yml up

build-dev:
	docker-compose -f docker/docker-compose.dev.yml build

restart:
	docker-compose -f docker/docker-compose.dev.yml restart photonix

shell:
	docker-compose -f docker/docker-compose.dev.yml exec photonix bash

manage:
	docker-compose -f docker/docker-compose.dev.yml exec photonix python photonix/manage.py ${}
