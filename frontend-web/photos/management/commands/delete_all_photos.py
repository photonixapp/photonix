from django.core.management.base import BaseCommand
from django.conf import settings
import os
import shutil

from photos.models import Camera, Photo, PhotoFile


class Command(BaseCommand):
    help = 'Deletes all photos and their related other models'

    def delete_all_photos(self):
        Photo.objects.all().delete()
        PhotoFile.objects.all().delete()
        Camera.objects.all().delete()

        for section in settings.PHOTO_OUTPUT_DIRS:
            shutil.rmtree(section['PATH'])
            os.makedirs(section['PATH'])

    def handle(self, *args, **options):
        self.delete_all_photos()
