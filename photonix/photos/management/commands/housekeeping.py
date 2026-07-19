import os
from pathlib import Path
from shutil import rmtree
from time import sleep

from django.conf import settings
from django.core.management.base import BaseCommand

from photonix.photos.models import Photo, PhotoTag, Task
from photonix.photos.utils.db import cleanup_orphaned_photofiles
from photonix.photos.utils.thumbnails import THUMBNAILER_VERSION
from photonix.web.utils import logger


class Command(BaseCommand):
    help = 'Makes sure that if there have been upgrades to thumbnailing or image analysis code then jobs get rescheduled.'

    def housekeeping(self):
        # Clean up PhotoFile records for source files that no longer exist on disk
        orphaned = cleanup_orphaned_photofiles()
        if orphaned:
            logger.info(f'Housekeeping: removed {orphaned} orphaned PhotoFile record(s)')

        # Remove old cache directories
        try:
            for directory in os.listdir(settings.THUMBNAIL_ROOT):
                if directory not in ['photofile']:
                    path = Path(settings.THUMBNAIL_ROOT) / directory
                    logger.info(f'Removing old cache directory {path}')
                    rmtree(path)
        except FileNotFoundError:  # In case thumbnail dir hasn't been created yet
            pass

        # Regenerate any outdated thumbnails
        photos = Photo.objects.filter(thumbnailed_version__lt=THUMBNAILER_VERSION)
        if photos.count():
            logger.info(f'Rescheduling {photos.count()} photos to have their thumbnails regenerated')
            for photo in photos:
                Task(
                    type='generate_thumbnails', subject_id=photo.id,
                    library=photo.library).save()

        # Re-run face detection where the face model has been upgraded. Face
        # PhotoTags from an older model carry 128-D FaceNet embeddings that are
        # incomparable with the new 512-D ArcFace ones, so any photo whose face
        # tags predate the current version needs re-analysis. run_on_photo()
        # preserves human-assigned names by box overlap during the rescan.
        self.reschedule_upgraded_face_detection()

        # Backfill CLIP embeddings for photos that predate semantic search
        # being enabled on their library - toggling a classifier on only
        # affects newly imported photos otherwise.
        self.schedule_missing_clip_embeddings()

    def _schedule_classifier_tasks(self, task_type, priority, id_library_pairs):
        """Create classifier Tasks for ``(photo_id, library_id)`` pairs in
        chunks, deduplicating against tasks that are already queued, running,
        waiting or recently failed ('F' is included because failed tasks are
        retried by requeue_stuck_tasks - scheduling another would let a
        permanently failing photo accumulate one duplicate per run).

        Chunked so a 100k-photo library produces bounded-size queries and
        batched INSERTs instead of one giant ``IN`` clause and one INSERT per
        photo. bulk_create bypasses VersionedModel.save(), so the timestamps
        it would have set are supplied explicitly. Returns the number created.
        """
        from django.utils import timezone

        total = 0
        chunk = []

        def flush():
            nonlocal total
            if not chunk:
                return
            existing = set(
                Task.objects.filter(
                    type=task_type, subject_id__in=[pid for pid, _ in chunk],
                    status__in=['P', 'S', 'M', 'F'],
                ).values_list('subject_id', flat=True)
            )
            now = timezone.now()
            new_tasks = [
                Task(type=task_type, subject_id=pid, library_id=lib_id,
                     priority=priority, created_at=now, updated_at=now)
                for pid, lib_id in chunk if pid not in existing]
            Task.objects.bulk_create(new_tasks)
            total += len(new_tasks)
            chunk.clear()

        for pair in id_library_pairs:
            chunk.append(pair)
            if len(chunk) >= 1000:
                flush()
        flush()
        return total

    def reschedule_upgraded_face_detection(self):
        from photonix.classifiers.face.model import FaceModel
        from photonix.photos.utils.classification import CLASSIFIER_PRIORITIES

        stale = PhotoTag.objects.filter(
            tag__type='F',
            photo__deleted=False,
            photo__library__classification_face_enabled=True,
            model_version__gt=0,
            model_version__lt=FaceModel.version,
        ).values_list('photo_id', 'photo__library_id').distinct()

        count = self._schedule_classifier_tasks(
            'classify.face', CLASSIFIER_PRIORITIES['face'],
            stale.iterator(chunk_size=1000))
        if count:
            logger.info(f'Rescheduled {count} photos for face re-detection '
                        f'(model upgraded to {FaceModel.version})')

    def schedule_missing_clip_embeddings(self):
        from photonix.classifiers.clip.model import ClipModel
        from photonix.photos.utils.classification import CLASSIFIER_PRIORITIES

        missing = Photo.objects.filter(
            library__classification_clip_enabled=True,
            deleted=False,
        ).exclude(
            embeddings__type='C',
            embeddings__model_version__gte=ClipModel.version,
        ).values_list('id', 'library_id')

        count = self._schedule_classifier_tasks(
            'classify.clip', CLASSIFIER_PRIORITIES['clip'],
            missing.iterator(chunk_size=1000))
        if count:
            logger.info(f'Scheduled {count} photos for CLIP embedding backfill')

    def handle(self, *args, **options):
        self.housekeeping()
