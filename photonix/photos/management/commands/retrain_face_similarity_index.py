from datetime import datetime
import json
import os
from pathlib import Path
from time import time

from django.conf import settings
from django.core.management.base import BaseCommand
from django.utils import timezone

from photonix.photos.models import Library, PhotoTag
from photonix.classifiers.face.model import FaceModel
from photonix.web.utils import logger


class Command(BaseCommand):
    help = 'Creates Approximate Nearest Neighbour (ANN) search index for quickly finding closest face without having to compare one-by-one.'

    def retrain_face_similarity_index(self):
        for library in Library.objects.all():
            version_file = Path(settings.MODEL_DIR) / 'face' / f'{library.id}_retrained_version.txt'
            version_date = None

            if os.path.exists(version_file):
                with open(version_file) as f:
                    contents = f.read().strip()
                    version_date = datetime.strptime(contents, '%Y%m%d%H%M%S').replace(tzinfo=timezone.utc)

            start = time()
            logger.info(f'Updating ANN index for Library {library.id}')

            if PhotoTag.objects.filter(tag__type='F').count() == 0:
                logger.info('    No Face PhotoTags in Library so no point in creating face ANN index yet')
                return
            if version_date and PhotoTag.objects.filter(updated_at__gt=version_date, tag__type='F').count() == 0:
                logger.info('    No new Face PhotoTags in Library so no point in updating face ANN index')
                return

            FaceModel(library_id=library.id).retrain_face_similarity_index()

            logger.info(f'    Completed in {(time() - start):.3f}s')

    def handle(self, *args, **options):
        self.retrain_face_similarity_index()
