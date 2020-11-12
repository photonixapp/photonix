start:
	docker-compose -f docker/docker-compose.dev.yml up

build:
	docker-compose -f docker/docker-compose.dev.yml build

start-prd:
	docker-compose -f docker/docker-compose.prd.yml up

build-prd:
	docker-compose -f docker/docker-compose.prd.yml build

restart:
	docker-compose -f docker/docker-compose.dev.yml restart photonix

shell:
	docker-compose -f docker/docker-compose.dev.yml exec photonix bash

manage:
	docker-compose -f docker/docker-compose.dev.yml exec photonix python photonix/manage.py ${}

test:
	docker-compose -f docker/docker-compose.dev.yml exec photonix python test.py
