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

    def reschedule_upgraded_face_detection(self):
        from photonix.classifiers.face.model import FaceModel
        from photonix.photos.utils.classification import CLASSIFIER_PRIORITIES

        stale_photo_ids = set(
            PhotoTag.objects.filter(
                tag__type='F',
                photo__library__classification_face_enabled=True,
                model_version__gt=0,
                model_version__lt=FaceModel.version,
            ).values_list('photo_id', flat=True).distinct()
        )
        if not stale_photo_ids:
            return

        # Dedupe against face tasks that are already queued/running/waiting so a
        # repeated housekeeping run doesn't pile up duplicate work.
        existing = set(
            Task.objects.filter(
                type='classify.face', subject_id__in=stale_photo_ids,
                status__in=['P', 'S', 'M'],
            ).values_list('subject_id', flat=True)
        )
        to_schedule = [pid for pid in stale_photo_ids if pid not in existing]
        if not to_schedule:
            return

        logger.info(f'Rescheduling {len(to_schedule)} photos for face re-detection '
                    f'(model upgraded to {FaceModel.version})')
        for photo in Photo.objects.filter(id__in=to_schedule).select_related('library'):
            Task(
                type='classify.face', subject_id=photo.id,
                library=photo.library, priority=CLASSIFIER_PRIORITIES['face']).save()

    def handle(self, *args, **options):
        self.housekeeping()
