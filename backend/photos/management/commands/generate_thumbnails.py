from django.core.management.base import BaseCommand

from photos.models import Photo
from photos.utils.thumbnails import generate_thumbnails_for_photo
from web.utils import notify_ui


class Command(BaseCommand):
    help = 'Generates thumbnails for all the Photos at all dimensions'

    def generate_thumbnails(self):
        for photo in Photo.objects.all().order_by('-taken_at'):
            try:
                generate_thumbnails_for_photo(photo)
            except FileNotFoundError:
                pass

    def handle(self, *args, **options):
        notify_ui('photo_thubnails_generating', True)
        self.generate_thumbnails()
        notify_ui('photo_thubnails_generating', False)
