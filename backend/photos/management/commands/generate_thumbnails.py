from django.core.management.base import BaseCommand

from photos.models import Photo
from photos.utils.thumbnails import generate_thumbnail
from web.utils import notify


class Command(BaseCommand):
    help = 'Generates thumbnails for all the Photos at all dimensions'

    def generate_thumbnails(self):
        for photo in Photo.objects.all().order_by('-taken_at'):
            try:
                generate_thumbnail(photo)
            except FileNotFoundError:
                pass

    def handle(self, *args, **options):
        notify('photo_thubnails_generating', True)
        self.generate_thumbnails()
        notify('photo_thubnails_generating', False)
