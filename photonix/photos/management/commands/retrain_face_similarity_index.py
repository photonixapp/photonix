import json
import os
from pathlib import Path

from annoy import AnnoyIndex
from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db.utils import IntegrityError

from photonix.photos.models import PhotoTag
from photonix.photos.utils.db import record_photo
from photonix.photos.utils.fs import determine_destination, download_file


class Command(BaseCommand):
    help = 'Creates Approximate Nearest Neighbour (ANN) search index for quickly finding closest face without having to compare one-by-one.'

    def retrain_face_similarity_model(self):
        ann_path = Path(settings.MODEL_DIR) / 'face' / 'faces.ann'
        tag_ids_path = Path(settings.MODEL_DIR) / 'face' / 'faces_tag_ids.json'

        if PhotoTag.objects.filter(tag__type='F').count() < 10:
            print('Not enough face tags to warrant building ANN index')
            try:
                os.remove(ann_path)
                os.remove(tag_ids_path)
            except:
                pass
            exit(0)

        embedding_size = 128  # FaceNet output size
        t = AnnoyIndex(embedding_size, 'euclidean')
        tag_ids = []
        for photo_tag in PhotoTag.objects.filter(tag__type='F'):
            extra_data = json.loads(photo_tag.extra_data)
            embedding = extra_data['facenet_embedding']
            t.add_item(len(tag_ids), embedding)
            tag_ids.append(str(photo_tag.tag.id))

        # Build the ANN index
        t.build(3)  # Number of random forest trees
        t.save(str(ann_path))

        # Save Tag IDs to JSON file as Annoy only supports integer IDs so we have to do the mapping ourselves
        with open(tag_ids_path, 'w') as f:
            f.write(json.dumps(tag_ids))



    def handle(self, *args, **options):
        self.retrain_face_similarity_model()
