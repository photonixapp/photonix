import datetime as dt
import json
import os
from time import time

from django.core.management.base import BaseCommand

from photonix.classifiers.clip.model import (
    CLIP_EMBEDDING_TYPE, _clip_index_paths, retrain_clip_similarity_index)
from photonix.photos.models import Library, PhotoEmbedding
from photonix.web.utils import logger


class Command(BaseCommand):
    help = ('Creates Approximate Nearest Neighbour (ANN) search index over CLIP '
            'embeddings so semantic search can find the closest photos quickly.')

    def retrain_clip_similarity_index(self):
        # Only libraries with CLIP enabled produce embeddings worth indexing.
        for library in Library.objects.filter(classification_clip_enabled=True):
            _, ids_path, version_file = _clip_index_paths(library.id)
            version_date = None

            if os.path.exists(version_file):
                with open(version_file) as f:
                    contents = f.read().strip()
                if contents:
                    # datetime.timezone.utc, not django.utils.timezone.utc -
                    # the Django alias was removed in Django 5/6
                    version_date = dt.datetime.strptime(contents, '%Y%m%d%H%M%S').replace(tzinfo=dt.timezone.utc)

            embeddings = PhotoEmbedding.objects.filter(
                photo__library_id=library.id, type=CLIP_EMBEDDING_TYPE,
                photo__deleted=False)
            embedding_count = embeddings.count()
            if embedding_count == 0:
                logger.info(f'    No CLIP embeddings in Library {library.id} so no point in creating CLIP ANN index yet')
                continue

            # Deleting a photo removes its embedding row but produces no
            # updated_at bump, so also rebuild whenever the row count differs
            # from the number of ids the index was built with - otherwise
            # deleted photos occupy ANN result slots indefinitely.
            indexed_count = None
            if os.path.exists(ids_path):
                try:
                    with open(ids_path) as f:
                        indexed_count = len(json.load(f))
                except (ValueError, OSError):
                    indexed_count = None
            if (version_date and indexed_count == embedding_count
                    and embeddings.filter(updated_at__gt=version_date).count() == 0):
                logger.info(f'    No new CLIP embeddings in Library {library.id} so no point in updating CLIP ANN index')
                continue

            start = time()
            logger.info(f'Updating CLIP ANN index for Library {library.id}')
            count = retrain_clip_similarity_index(library.id)
            logger.info(f'    Indexed {count} embeddings in {(time() - start):.3f}s')

    def handle(self, *args, **options):
        self.retrain_clip_similarity_index()
