build:
	docker-compose -f docker-compose.dev.yml build

start:
	docker-compose -f docker-compose.dev.yml up

restart:
	docker-compose -f docker-compose.dev.yml restart photonix

shell:
	docker-compose -f docker-compose.dev.yml exec photonix bash

manage:
	docker-compose -f docker-compose.dev.yml exec photonix python photonix/manage.py ${}
