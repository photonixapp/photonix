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


## Future work

### Deep learning

* Use Tensorflow's [Detection Model Zoo](https://github.com/tensorflow/models/blob/master/research/object_detection/g3doc/detection_model_zoo.md) initially Mobilenet trained on COCO. It should be able to give bounding boxes. The Open Images dataset-trained models might also be useful for a wider range of labels.
* Object detection with bounding boxes using [YOLO](https://pjreddie.com/darknet/yolo/). This might not be required if Tensorflow Detection Model Zoo is good enough, SSD seems better than YOLO now which is in the models above. Using this just on the pre-trained COCO dataset should be a good enough start as the labels are things that people would take search for. Locating and counting the people in photos will be a great use on it's own.
* Use [Recognizing Image Style](http://sergeykarayev.com/recognizing-image-style) to label style of an image. Might be worth downloading the dataset and using it to retrain a modern model like Mobilenet. [Tensorflow implementation](https://github.com/joelthchao/tensorflow-finetune-flickr-style) and labels can be seen [here](https://github.com/joelthchao/tensorflow-finetune-flickr-style/blob/master/assemble_data.py#L15).
* Score photos using [NIMA Neural Image Assessment](https://research.googleblog.com/2017/12/introducing-nima-neural-image-assessment.html). We can use this to determine things like what to use for album covers and slideshows.

### Updates

* New ML models could be dirtibuted via IPFS as they are quite big. The installation would include the IPFS client and once they have downloaded the new model they become a peer to share with other users and reduce bandwith.
