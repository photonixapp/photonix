import os
from pathlib import Path
from shutil import rmtree
from time import sleep

from django.conf import settings
from django.core.management.base import BaseCommand

from photonix.photos.models import Photo, Task
from photonix.photos.utils.thumbnails import THUMBNAILER_VERSION
from photonix.web.utils import logger


class Command(BaseCommand):
    help = 'Makes sure that if there have been upgrades to thumbnailing or image analysis code then jobs get rescheduled.'

    def housekeeping(self):
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

    def handle(self, *args, **options):
        self.housekeeping()
