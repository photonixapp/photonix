from datetime import datetime
import os
from pathlib import Path
from time import time

from django.conf import settings
from django.core.management.base import BaseCommand
from django.utils import timezone

from photonix.classifiers.clip.model import (
    CLIP_EMBEDDING_TYPE, retrain_clip_similarity_index)
from photonix.photos.models import Library, PhotoEmbedding
from photonix.web.utils import logger


class Command(BaseCommand):
    help = ('Creates Approximate Nearest Neighbour (ANN) search index over CLIP '
            'embeddings so semantic search can find the closest photos quickly.')

    def retrain_clip_similarity_index(self):
        # Only libraries with CLIP enabled produce embeddings worth indexing.
        for library in Library.objects.filter(classification_clip_enabled=True):
            version_file = Path(settings.MODEL_DIR) / 'clip' / f'{library.id}_clip_version.txt'
            version_date = None

            if os.path.exists(version_file):
                with open(version_file) as f:
                    contents = f.read().strip()
                if contents:
                    version_date = datetime.strptime(contents, '%Y%m%d%H%M%S').replace(tzinfo=timezone.utc)

            embeddings = PhotoEmbedding.objects.filter(
                photo__library_id=library.id, type=CLIP_EMBEDDING_TYPE)
            if embeddings.count() == 0:
                logger.info(f'    No CLIP embeddings in Library {library.id} so no point in creating CLIP ANN index yet')
                continue
            if version_date and embeddings.filter(updated_at__gt=version_date).count() == 0:
                logger.info(f'    No new CLIP embeddings in Library {library.id} so no point in updating CLIP ANN index')
                continue

            start = time()
            logger.info(f'Updating CLIP ANN index for Library {library.id}')
            count = retrain_clip_similarity_index(library.id)
            logger.info(f'    Indexed {count} embeddings in {(time() - start):.3f}s')

    def handle(self, *args, **options):
        self.retrain_clip_similarity_index()
