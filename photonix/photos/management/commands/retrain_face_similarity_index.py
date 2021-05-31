from datetime import datetime
import json
import os
from pathlib import Path
from time import time

from annoy import AnnoyIndex
from django.conf import settings
from django.core.management.base import BaseCommand
from django.utils import timezone
import redis
from redis_lock import Lock

from photonix.photos.models import PhotoTag


class Command(BaseCommand):
    help = 'Creates Approximate Nearest Neighbour (ANN) search index for quickly finding closest face without having to compare one-by-one.'

    def retrain_face_similarity_index(self):
        ann_path = Path(settings.MODEL_DIR) / 'face' / 'faces.ann'
        tag_ids_path = Path(settings.MODEL_DIR) / 'face' / 'faces_tag_ids.json'
        version_file = Path(settings.MODEL_DIR) / 'face' / 'retrained_version.txt'
        version_date = None

        if os.path.exists(version_file):
            with open(version_file) as f:
                contents = f.read().strip()
                version_date = datetime.strptime(contents, '%Y%m%d%H%M%S').replace(tzinfo=timezone.utc)

        if version_date and PhotoTag.objects.filter(updated_at__gt=version_date).count() == 0:
            print('No new PhotoTags so no point in updating face ANN index')
            return

        start = time()

        if PhotoTag.objects.filter(tag__type='F').count() < 10:
            print('Not enough face tags to warrant building face ANN index')
            try:
                os.remove(ann_path)
                os.remove(tag_ids_path)
            except:
                pass
            return

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

        # Aquire lock to save ANN, tag IDs and version files atomically
        r = redis.Redis(host=os.environ.get('REDIS_HOST', '127.0.0.1'))
        with Lock(r, 'face_model_retrain'):
            # Save ANN index
            t.save(str(ann_path))

            # Save Tag IDs to JSON file as Annoy only supports integer IDs so we have to do the mapping ourselves
            with open(tag_ids_path, 'w') as f:
                f.write(json.dumps(tag_ids))

            # Save version of retrained model to text file - used to save against on PhotoTag model and to determine whether retraining is required
            with open(version_file, 'w') as f:
                f.write(datetime.utcnow().strftime('%Y%m%d%H%M%S'))

        print(f'Face ANN index updated in {(time() - start):.3f}s')

    def handle(self, *args, **options):
        self.retrain_face_similarity_index()
