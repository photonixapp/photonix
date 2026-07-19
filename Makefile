DOCKER_COMPOSE_DEV=docker compose -f docker/docker-compose.dev.yml
DOCKER_COMPOSE_PRD=docker compose -f docker/docker-compose.prd.yml

start:
	$(DOCKER_COMPOSE_DEV) up

stop:
	$(DOCKER_COMPOSE_DEV) down

build:
	$(DOCKER_COMPOSE_DEV) build

start-prd:
	$(DOCKER_COMPOSE_PRD) up

stop-prd:
	$(DOCKER_COMPOSE_PRD) down

build-prd:
	$(DOCKER_COMPOSE_PRD) build

# Optional ML sidecar image (runs only the classification processors).
# See the "Running classification in a separate container" section of README.md.
# DOCKER_BUILDKIT=1 because Dockerfile.ml uses `RUN --mount=type=secret`, which
# the legacy builder can't parse.
build-ml:
	DOCKER_BUILDKIT=1 docker build -f docker/Dockerfile.ml -t photonix-ml .

restart:
	$(DOCKER_COMPOSE_DEV) restart photonix

shell:
	$(DOCKER_COMPOSE_DEV) exec photonix bash

shell-prd:
	$(DOCKER_COMPOSE_PRD) exec photonix bash

# Usage: make manage ARGS="migrate"
manage:
	$(DOCKER_COMPOSE_DEV) exec photonix python photonix/manage.py $(ARGS)

test:
	$(DOCKER_COMPOSE_DEV) run -e PYTHONDONTWRITEBYTECODE=1 --rm photonix python test.py

test-coverage:
	$(DOCKER_COMPOSE_DEV) run -e PYTHONDONTWRITEBYTECODE=1 -e COVERAGE=1 --rm photonix python test.py

lint-ui:
	cd ui && npm run lint

build-ui:
	cd ui && npm run build

# Playwright suite is the UI test suite; needs the dev stack running (make start)
e2e:
	cd ui && npm run test:e2e

test-ui: e2e

reset:
	$(DOCKER_COMPOSE_DEV) down -v
