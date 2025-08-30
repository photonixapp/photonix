# Photonix Photo Manager

> ### Fork Information
> This repository is a fork of the original [photonixapp/photonix](https://github.com/photonixapp/photonix) project by Damian Moore. This version is being actively developed and refactored for improved performance, reliability, and new features. Full credit goes to the original author for their foundational work.

This is a photo management application based on web technologies. Run it on your home server and it will let you find what you want from your photo collection using any device. Smart filtering is made possible automatically by object recognition, location awareness, color analysis and other algorithms.

![Screenshot of photo list view](https://epixstudios.co.uk/uploads/filer_public/52/dc/52dcdff4-d96d-4dfd-b158-b57b0696154e/photo_list.jpg)

This project is currently in development and not feature complete for a version 1.0 yet. If you don't mind putting up with broken parts or want to help out, run the Docker image and give it a go. I'd love for other contributors to get involved.

## Installing & Running

The easiest way to run it is with [Docker Compose](https://docs.docker.com/compose/install/#install-compose) using the pre-built image following these steps.

Create a new directory to run inside and download the example Docker Compose file. **Note: This URL will be updated once the forked repository is public.**

    mkdir photonix
    cd photonix
    curl https://raw.githubusercontent.com/YOUR_USERNAME/photonix/master/docker/docker-compose.example.yml > docker-compose.yml

Make volume directories for data stored outside the container.

    mkdir -p  data/photos

Bring up Docker Compose which will pull and run the required Docker images.

    docker-compose up

A few seconds after starting you should be able to go to [http://localhost:8888/](http://localhost:8888/) in your browser.

You'll need to create a username, password and library. Right now this needs to be done on the command-line so run this in a new terminal window. Replace `USERNAME` with your own username.

    docker-compose run photonix python photonix/manage.py createsuperuser --username USERNAME --email example@example.com
    docker-compose run photonix python photonix/manage.py create_library USERNAME "My Library"

You can move some photos into the folder `data/photos` and they should get detected and imported immediately. Once you have finished trying out the system you can edit the volume in the `docker-compose.yml` file where it says `./data/photos` to mount wherever you usually keep photos. System database, thumbnails and other cache data is stored separately from the photos so shouldn't pollute the area. You are responsible for keeping your own backups in case of error.

## Upgrading

If you are using the pre-built Docker image you can use kill, pull and bring back up using the following:

    # Ctrl-C to kill
    docker-compose pull
    docker-compose up

## Developing

There is a [`Makefile`](./Makefile) and separate Docker Compose file `docker-compose.dev.yml` that you should use if you want to work on the project. Check out the repo and this setup will build the image, mount the code as volumes, hot-reload JS changes to the browser and reload the Python server for most changes.

    git clone git@github.com:YOUR_USERNAME/photonix.git
    cd photonix
    mkdir -p  data/photos
    make build
    make start

If you get errors such as `Error starting userland proxy: listen tcp 0.0.0.0:5432: bind: address alerady in use` then you probably have an existing server such as Postgres listening on the standard port. You can change Photonix's services to use alternative port numbers by editing `docker/docker-compose.dev.yml` and setting `'5432:5432'` to be `'5433:5432'` for example. This is for Postgres but is it a similar solution for Redis or the webserver ports.

If you want to access the Bash or Python shells for development, you can use the following command.

    make shell

## Testing

PyTest is used as a test runner and for creating fixtures. The easiest way to run the tests is within the Docker container like this:

    make test
