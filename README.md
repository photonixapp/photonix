# photo-manager

Photo management application based on web technologies.

This project is currently in early stages. I have a lot of thoughts on how I want photo management and viewing to work. I'm on the way to an MVP and it's shaping up nicely so stay tuned... also please suggest a name for this thing! :)

The easiest way to try it out is with docker-compose (though there are currently no pre-built images so it will take a while to download and build).

```
git clone git@github.com:damianmoore/photo-manager.git
cd photo-manager/
docker-compose build
docker-compose up
```

A few seconds after starting you should be able to go to [http://localhost:8888/](http://localhost:8888/) in your browser.

You can move some photos into the folder `data/photos` and they should get detected and imported immediately. Once you have finished trying out the system you can edit the volume in the `docker-compose.yml` file where it says `./data/photos` to mount wherever you usually keep photos. System database, thumbnails and other cache data is stored separately from the photos so shouldn't pollute the area. You are responsible for keeping your own backups in case of error.
