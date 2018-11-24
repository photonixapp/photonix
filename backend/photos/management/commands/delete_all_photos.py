from django.core.management.base import BaseCommand
from django.conf import settings
import os
import shutil

from photos.models import Camera, Lens, Photo, PhotoFile, Face, Tag


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
                print(e)

    def delete_all_photos(self):
        Camera.objects.all().delete()
        Lens.objects.all().delete()
        Photo.objects.all().delete()
        PhotoFile.objects.all().delete()
        Face.objects.all().delete()
        Tag.objects.all().delete()

        self.clear_dir(settings.THUMBNAIL_ROOT)

        for section in settings.PHOTO_OUTPUT_DIRS:
            try:
                self.clear_dir(section['PATH'])
            except OSError:
                pass

    def handle(self, *args, **options):
        self.delete_all_photos()
