# Photonix Photo Manager

![GitHub](https://img.shields.io/github/license/photonixapp/photonix) [![Docker Image Version (latest semver)](https://img.shields.io/docker/v/photonixapp/photonix)](https://hub.docker.com/r/photonixapp/photonix/) [![GitHub Sponsors](https://img.shields.io/github/sponsors/photonixapp)](https://github.com/sponsors/photonixapp) [![Docker Pulls](https://img.shields.io/docker/pulls/photonixapp/photonix)](https://hub.docker.com/r/photonixapp/photonix/) [![](https://img.shields.io/travis/damianmoore/photonix/master.svg)](https://travis-ci.org/damianmoore/photonix/branches) [![](https://img.shields.io/codecov/c/github/damianmoore/photonix.svg)](https://codecov.io/gh/damianmoore/photonix) [![](https://img.shields.io/uptimerobot/status/m781745452-4f90c0e2a56b2086dd0c5092.svg?label=demo%20site)](https://demo.photonix.org/) [![](https://img.shields.io/uptimerobot/ratio/m781745452-4f90c0e2a56b2086dd0c5092.svg)](https://demo.photonix.org/)

This is a photo management application based on web technologies. Run it on your home server and it will let you find what you want from your photo collection using any device. Smart filtering is made possible automatically by object recognition, location awareness, color analysis and other algorithms.

![Screenshot of photo list view](https://epixstudios.co.uk/uploads/filer_public/52/dc/52dcdff4-d96d-4dfd-b158-b57b0696154e/photo_list.jpg)

This project is currently in development and not feature complete for a version 1.0 yet. If you don't mind putting up with broken parts or want to help out, run the Docker image and give it a go. I'd love for other contributors to get involved.

## Community and Social

Please join in the discussion and help us gain visibility by following us on social media. Much appreciated :)

- [Gitter live chat](https://gitter.im/photonixapp/community)
- [Docker Hub](https://hub.docker.com/r/photonixapp/photonix/)
- [Twitter](https://twitter.com/photonixapp)
- [Instagram](https://www.instagram.com/photonixapp/)
- [LinkedIn](https://www.linkedin.com/company/photonixapp/)
- [Indie Hackers](https://www.indiehackers.com/product/photonix-photo-organizer-app)

## Sponsorship

If you get value from Photonix or like where we're heading then we'd really appreciate it if you considered sponsoring us on a monthly basis.

- [GitHub Sponsors](https://github.com/sponsors/photonixapp)
- [Patreon](https://www.patreon.com/photonixapp)

## Installing & Running

The easiest way to run it is with [Docker Compose](https://docs.docker.com/compose/install/#install-compose) using the pre-built image following these steps.

Create a new directory to run inside and download the example Docker Compose file.

    mkdir photonix
    cd photonix
    curl https://raw.githubusercontent.com/photonixapp/photonix/master/docker/docker-compose.example.yml > docker-compose.yml

Make volume directories for data stored outside the container.

    mkdir -p  data/photos

Bring up Docker Compose which will pull and run the required Docker images.

    docker-compose up

A few seconds after starting you should be able to go to [http://localhost:8888/](http://localhost:8888/) in your browser.

You'll need to create a username, password and library. Right now this needs to be done on the command-line so run this in a new terminal window. Replace `USERNAME` with your own username.

    docker-compose run photonix python photonix/manage.py createsuperuser --username USERNAME --email example@example.com
    docker-compose run photonix python photonix/manage.py create_library USERNAME "My Library"

You can move some photos into the folder `data/photos` and they should get detected and imported immediately. Once you have finished trying out the system you can edit the volume in the `docker-compose.yml` file where it says `./data/photos` to mount wherever you usually keep photos. System database, thumbnails and other cache data is stored separately from the photos so shouldn't pollute the area. You are responsible for keeping your own backups in case of error.

## Memory requirements

Photonix runs several background processes and, while it analyses photos, loads machine-learning models (face, object, style and others). The figures below are measurements, not estimates, taken in Docker with `ENV=prd` and the demo library's sample photos being analysed for real, in two rounds:

- **Round A** (default layout before idle exit existed, and `CLASSIFICATION_DISABLED=1`): the `photonixapp/photonix:edge` image with only the newer `system/` directory mounted over it, analysing the 10 original demo photos.
- **Round B** (`LOW_MEMORY=1`, and the default layout with idle exit): the same image with the newer `photonix/` and `system/` directories mounted, analysing all 14 demo photos (ten are 20 megapixel JPEGs).

"Peak" is the container's `memory.peak` (it includes file cache). Figures are MB divided by 1000, rounded to the nearest 0.1 GB. Limits are Docker `--memory` values (`4g` and so on). Run `system/memory_report.sh` inside the container to see the same per-process numbers on your own install.

| Layout | Idle, before analysis | Peak while analysing | Idle, after analysis |
|---|---|---|---|
| Default (`LOW_MEMORY` unset): seven classifier processes | 1.3 GB (round A) | 6.1 GB (round A, 10 photos; hit a 6 GB limit and was OOM-killed repeatedly) | 5.2 GB before idle exit existed (round A); 1.5 GB at a 4 GB limit with idle exit (round B; analysis did not finish, see below) |
| `LOW_MEMORY=1`: one classifier process | 0.6 GB (round B) | 3.3 GB with object detection turned off (round B; completes in a 4 GB limit, no kills); 5.1 GB with it on (round B; completes in a 5 GB limit, no kills, but reached the limit) | 0.6 GB (round B) |
| `CLASSIFICATION_DISABLED=1`: no classifiers | 0.6 GB (round A, `GUNICORN_WORKERS=2`) | not applicable | not applicable |

Minimum RAM, rounded up from those measurements:

- **No classifiers** (`CLASSIFICATION_DISABLED=1 GUNICORN_WORKERS=2`): 1 GB.
- **`LOW_MEMORY=1`, object detection turned off** (Library settings): 4 GB. It finished all 14 photos in a 4 GB limit with no OOM kills and peaked at 3.3 GB; a 3 GB limit killed the face classifier once.
- **`LOW_MEMORY=1`, everything on**: 5 GB. It finished all 14 photos in a 5 GB limit with no OOM kills, but memory use reached the limit (4.9 GB of it held by processes while object detection ran through the 20 megapixel photos), so 5 GB leaves no headroom. A 4 GB limit OOM-killed object detection 5 times and left 5 photos without object tags.
- **Default layout**: more than 6 GB. At a 4 GB limit it was OOM-killed 13 times in 8 minutes and left 14 analysis tasks unfinished.

Low-memory mode analyses one photo at a time with one model loaded at a time, so a large import takes longer.

Do not run `classification_processor` (low-memory mode) alongside the per-classifier `classification_*_processor` programs: both would claim the same tasks and load several models at once. Pick one layout by setting `LOW_MEMORY`; do not start the commands by hand next to it.

| Environment variable | Default | Effect |
|---|---|---|
| `LOW_MEMORY` | unset | `1` starts a single classification process that keeps one model loaded, and defaults `GUNICORN_WORKERS`, `THUMBNAIL_WORKERS` and `RAW_WORKERS` to 2, 1 and 1. |
| `CLASSIFICATION_DISABLED` | unset | `1` runs no classification processes at all (the classifiers may run elsewhere). Takes priority over `LOW_MEMORY`. |
| `GUNICORN_WORKERS` | 8 (2 with `LOW_MEMORY=1`) | Web worker processes, roughly 50-60 MB each. |
| `THUMBNAIL_WORKERS` | half the CPU count (1 with `LOW_MEMORY=1`) | Threads generating thumbnails. |
| `RAW_WORKERS` | a quarter of the CPU count (1 with `LOW_MEMORY=1`) | Threads converting raw files. |
| `CLASSIFIER_EXIT_WHEN_IDLE` | `1` | A classifier process that has unloaded its last model exits and is restarted clean, returning the memory TensorFlow keeps. With `LOW_MEMORY=1` it also restarts the single classifier process on every switch of model type, so each model loads into a fresh process. `0` turns both off; in low-memory mode the models then stack up in one process, and that configuration OOM-killed object detection in every limit tried up to 5 GB. |
| `CLASSIFIER_IDLE_TIMEOUT` | 300 | Seconds a model sits unused before it is unloaded. |
| `CLASSIFIER_MEMORY_BUFFER_MB` | 500 | Free memory that must remain after a model is loaded; a task waits if loading would breach it. |

## Upgrading

If you are using the pre-built Docker image you can use kill, pull and bring back up using the following:

    # Ctrl-C to kill
    docker-compose pull
    docker-compose up

## Developing

For detailed developer documentation, see:

- **[Developer Docs](https://photonix.org/docs/developer/)** - Full documentation on the website
- **[Docs Source](https://github.com/photonixapp/photonix-website/tree/master/docs)** - Markdown source files on GitHub

### Quick Start

There is a [`Makefile`](./Makefile) and separate Docker Compose file `docker-compose.dev.yml` that you should use if you want to work on the project. Check out the repo and this setup will build the image, mount the code as volumes, hot-reload JS changes to the browser and reload the Python server for most changes.

    git clone git@github.com:photonixapp/photonix.git
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
