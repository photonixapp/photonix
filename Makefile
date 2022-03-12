DOCKER_COMPOSE_DEV=docker-compose -f docker/docker-compose.dev.yml
DOCKER_COMPOSE_PRD=docker-compose -f docker/docker-compose.prd.yml

start:
	$(DOCKER_COMPOSE_DEV) up

build:
	$(DOCKER_COMPOSE_DEV) build

start-prd:
	$(DOCKER_COMPOSE_PRD) up

build-prd:
	$(DOCKER_COMPOSE_PRD) build

restart:
	$(DOCKER_COMPOSE_DEV) restart photonix

shell:
	$(DOCKER_COMPOSE_DEV) exec photonix bash

shell-prd:
	$(DOCKER_COMPOSE_PRD) exec photonix bash

manage:
	$(DOCKER_COMPOSE_DEV) exec photonix python photonix/manage.py ${}

test:
	$(DOCKER_COMPOSE_DEV) run -e PYTHONDONTWRITEBYTECODE=1 --rm photonix python test.py
