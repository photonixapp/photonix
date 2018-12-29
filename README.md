# Photo Manager

*This project is in dire need of a name - please send suggestions!*

This is a photo management application based on web technologies. Run it on your home server and it will let you find what you want from your photo collection using any device. Smart filtering is made possible automatically by object recognition, location awareness, color analysis and other algorithms.

![Screenshot of photo list view](https://epixstudios.co.uk/uploads/filer_public/31/25/3125a68a-046a-443b-be24-59bbe210bdb6/photo_list.jpg)

This project is currently in development and not feature complete for a version 1.0 yet. If you don't mind putting up with broken parts or want to help out, run the Docker image and give it a go. I'd love for other contributors to get involved.


## Installing & Running

The easiest way to run it is with Docker Compose using the pre-built image following these steps.

Create a new directory to run inside and download the example Docker Compose file.

    mkdir photo-manager
    cd photo-manager
    curl https://raw.githubusercontent.com/damianmoore/photo-manager/master/docker-compose.example.yml > docker-compose.yml

Make volume directories for data stored outside the container.

    mkdir data
    mkdir data/photos

Bring up Docker Compose which will pull and run the required Docker images.

    docker-compose up

A few seconds after starting you should be able to go to [http://localhost:8888/](http://localhost:8888/) in your browser.

You can move some photos into the folder `data/photos` and they should get detected and imported immediately. Once you have finished trying out the system you can edit the volume in the `docker-compose.yml` file where it says `./data/photos` to mount wherever you usually keep photos. System database, thumbnails and other cache data is stored separately from the photos so shouldn't pollute the area. You are responsible for keeping your own backups in case of error.


## Developing

There is a separate Docker Compose file `docker-compose.dev.yml` that you should run if you want to work on the project. Check out the repo and this setup will build the image, mount the code as volumes, hot-reload JS changes to the browser and reload the Python server for most changes.

    git clone git@github.com:damianmoore/photo-manager.git
    cd photo-manager
    docker-compose -f docker-compose.dev.yml build
    docker-compose -f docker-compose.dev.yml up

If you want to access the Bash or Python shells for development, you can use the following helper scripts:

    ./docker_bash.sh  # Gets you into the running container
    ./docker_manage.sh  # Gets you into the Django/Python shell



* Website with public demo
* Improve filtering capabilities of the GraphQL API and hook up the filtering UI
* Faceted search of remaining filters based on ones currently selected
* Pagination in photo list while scrolling
* Detail view of photo whowing camera attributes, tags, mini map, bounding boxes from object detection
* Timeline month histogram scroller on photo list view
* Fix location tagging from country boundaries


## Future work

### Deep learning

* Score photos using [NIMA Neural Image Assessment](https://research.googleblog.com/2017/12/introducing-nima-neural-image-assessment.html). We can use this to determine things like what to use for album covers and slideshows.
