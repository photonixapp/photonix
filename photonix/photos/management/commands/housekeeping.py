import os
from pathlib import Path
from shutil import rmtree
from time import sleep

from django.conf import settings
from django.core.management.base import BaseCommand

from photonix.photos.models import Photo, Task
from photonix.photos.utils.thumbnails import THUMBNAILER_VERSION


class Command(BaseCommand):
    help = 'Makes sure that if there have been upgrades to thumbnailing or image analysis code then jobs get rescheduled.'

    def housekeeping(self):
        # Remove old cache directories
        for directory in os.listdir(settings.THUMBNAIL_ROOT):
            if directory not in ['photofile']:
                path = Path(settings.THUMBNAIL_ROOT) / directory
                print(f'Removing old cache directory {path}')
                rmtree(path)

        # Regenerate any outdated thumbnails
        photos = Photo.objects.filter(thumbnailed_version__lt=THUMBNAILER_VERSION)
        if photos.count():
            print(f'Rescheduling {photos.count()} photos to have their thumbnails regenerated')
            for photo in photos:
                Task(
                    type='generate_thumbnails', subject_id=photo.id,
                    library=photo.library).save()

    def handle(self, *args, **options):
        self.housekeeping()
