# Photo Manager

*This project is in dire need of a name - please send suggestions!*

This is a photo management application based on web technologies. Run it on your home server and it will let you find what you want from your photo collection using any device. Smart filtering is made possible automatically by object recognition, location awareness, color analysis and other algorithms.

![Screenshot of photo list view](https://epixstudios.co.uk/uploads/filer_public/31/25/3125a68a-046a-443b-be24-59bbe210bdb6/photo_list.jpg)

This project is currently in development and not all features are completed yet. If you don't mind putting up with broken parts or want to help out, clone the repo and give it a go. I'd love for other contributors to get involved.

The easiest way to try it out is with docker-compose (though there are currently no pre-built images so it will take a while to download and build). It's best to do development through Docker Compose as it means you have the correct PostgreSQL database set up with the correct GIS extensions and Redis.

```
git clone git@github.com:damianmoore/photo-manager.git
cd photo-manager/
docker-compose build
docker-compose up
```

A few seconds after starting you should be able to go to [http://localhost:8888/](http://localhost:8888/) in your browser.

You can move some photos into the folder `data/photos` and they should get detected and imported immediately. Once you have finished trying out the system you can edit the volume in the `docker-compose.yml` file where it says `./data/photos` to mount wherever you usually keep photos. System database, thumbnails and other cache data is stored separately from the photos so shouldn't pollute the area. You are responsible for keeping your own backups in case of error.

If you want to access the Python shell for development, use the following:

```
docker-compose run photomanager bash
python /srv/backend/manage.py shell
```


## Todo

* Improve filtering capabilities of the GraphQL API and hook up the filtering UI
* Faceted search of remaining filters based on ones currently selected
* Make photo detail view work with new state manager
* Make map view work with new state manager
* Pagination in photo list while scrolling
* Timeline month histogram scroller on photo list view
* Website with public demo


## Future work

### Deep learning

* Use Tensorflow's [Detection Model Zoo](https://github.com/tensorflow/models/blob/master/research/object_detection/g3doc/detection_model_zoo.md) initially Mobilenet trained on COCO. It should be able to give bounding boxes. The Open Images dataset-trained models might also be useful for a wider range of labels.
* Object detection with bounding boxes using [YOLO](https://pjreddie.com/darknet/yolo/). This might not be required if Tensorflow Detection Model Zoo is good enough, SSD seems better than YOLO now which is in the models above. Using this just on the pre-trained COCO dataset should be a good enough start as the labels are things that people would take search for. Locating and counting the people in photos will be a great use on it's own.
* Score photos using [NIMA Neural Image Assessment](https://research.googleblog.com/2017/12/introducing-nima-neural-image-assessment.html). We can use this to determine things like what to use for album covers and slideshows.
