import os
import shutil

from django.conf import settings
from django.core.management.base import BaseCommand

from photonix.photos.models import Camera, Lens, Photo, PhotoFile, Tag
from photonix.web.utils import logger


class Command(BaseCommand):
    help = 'Deletes all photos and their related other models'

    def clear_dir(self, path):
        for the_file in os.listdir(path):
            file_path = os.path.join(path, the_file)
            try:
                if os.path.isfile(file_path):
                    os.remove(file_path)
                elif os.path.isdir(file_path):
                    shutil.rmtree(file_path)
            except Exception as e:
                logger.error(e)

    def delete_all_photos(self):
        Camera.objects.all().delete()
        Lens.objects.all().delete()
        Photo.objects.all().delete()
        PhotoFile.objects.all().delete()
        Tag.objects.all().delete()

        dirs = [section['PATH'] for section in settings.PHOTO_OUTPUT_DIRS] + [settings.THUMBNAIL_ROOT] + [settings.PHOTO_RAW_PROCESSED_DIR]
        for path in dirs:
            try:
                self.clear_dir(path)
            except OSError:
                pass

    def handle(self, *args, **options):
        self.delete_all_photos()
