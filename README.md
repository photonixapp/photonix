# Photonix Photo Manager

[![](https://img.shields.io/travis/damianmoore/photonix.svg)](https://travis-ci.org/damianmoore/photonix) [![](https://img.shields.io/codecov/c/github/damianmoore/photonix.svg)](https://codecov.io/gh/damianmoore/photonix) [![](https://img.shields.io/uptimerobot/status/m781745452-4f90c0e2a56b2086dd0c5092.svg?label=demo%20site)](https://demo.photonix.org/) [![](https://img.shields.io/uptimerobot/ratio/m781745452-4f90c0e2a56b2086dd0c5092.svg)](https://demo.photonix.org/)

This is a photo management application based on web technologies. Run it on your home server and it will let you find what you want from your photo collection using any device. Smart filtering is made possible automatically by object recognition, location awareness, color analysis and other algorithms.

![Screenshot of photo list view](https://epixstudios.co.uk/uploads/filer_public/52/dc/52dcdff4-d96d-4dfd-b158-b57b0696154e/photo_list.jpg)

This project is currently in development and not feature complete for a version 1.0 yet. If you don't mind putting up with broken parts or want to help out, run the Docker image and give it a go. I'd love for other contributors to get involved.


## Installing & Running

The easiest way to run it is with [Docker Compose](https://docs.docker.com/compose/install/#install-compose) using the pre-built image following these steps.

Create a new directory to run inside and download the example Docker Compose file.

    mkdir photonix
    cd photonix
    curl https://raw.githubusercontent.com/damianmoore/photonix/master/docker-compose.example.yml > docker-compose.yml

Make volume directories for data stored outside the container.

    mkdir data
    mkdir data/photos

Bring up Docker Compose which will pull and run the required Docker images.

    docker-compose up

A few seconds after starting you should be able to go to [http://localhost:8888/](http://localhost:8888/) in your browser.

You can move some photos into the folder `data/photos` and they should get detected and imported immediately. Once you have finished trying out the system you can edit the volume in the `docker-compose.yml` file where it says `./data/photos` to mount wherever you usually keep photos. System database, thumbnails and other cache data is stored separately from the photos so shouldn't pollute the area. You are responsible for keeping your own backups in case of error.


## Upgrading

If you are using the pre-built Docker image you can use kill, pull and bring back up using the following:

    # Ctrl-C to kill
    docker-compose pull
    docker-compose up


## Developing

There is a separate Docker Compose file `docker-compose.dev.yml` that you should run if you want to work on the project. Check out the repo and this setup will build the image, mount the code as volumes, hot-reload JS changes to the browser and reload the Python server for most changes.

    git clone git@github.com:damianmoore/photonix.git
    cd photonix
    docker-compose -f docker-compose.dev.yml build
    docker-compose -f docker-compose.dev.yml up

If you want to access the Bash or Python shells for development, you can use the following helper scripts:

    ./docker_shell.sh  # Gets you into the running container
    ./docker_manage.sh  # Gets you into the Django/Python shell


## Testing

PyTest is used as a test runner and for creating fixtures. The easiest way to run the tests is within the Docker container like this:

    ./docker_shell.sh
    cd photonix
    python test.py
