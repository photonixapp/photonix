DOCKER_COMPOSE=docker-compose -f docker/docker-compose.dev.yml

start:
	$(DOCKER_COMPOSE) up

build:
	$(DOCKER_COMPOSE) build

start-prd:
	$(DOCKER_COMPOSE) up

build-prd:
	$(DOCKER_COMPOSE) build

restart:
	$(DOCKER_COMPOSE) restart photonix

shell:
	$(DOCKER_COMPOSE) exec photonix bash

manage:
	$(DOCKER_COMPOSE) exec photonix python photonix/manage.py ${}

test:
	$(DOCKER_COMPOSE) exec photonix python test.py
