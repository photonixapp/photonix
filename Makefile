start:
	docker-compose -f docker/docker-compose.prd.yml up

build:
	docker-compose -f docker/docker-compose.prd.yml build

dev:
	docker-compose -f docker/docker-compose.dev.yml up

restart:
	docker-compose -f docker/docker-compose.dev.yml restart photonix

shell:
	docker-compose -f docker/docker-compose.dev.yml exec photonix bash

manage:
	docker-compose -f docker/docker-compose.dev.yml exec photonix python photonix/manage.py ${}
