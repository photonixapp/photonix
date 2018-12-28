from time import sleep

from django.core.management.base import BaseCommand

from photos.models import Photo
from photos.utils.thumbnails import generate_thumbnails_for_photo


class Command(BaseCommand):
    help = 'Loads unthumbnailed photos onto the thumbnailing queues for processing.'

    def run_scheduler(self):
        # TODO: Put these tasks on a thumbnailing queue like the classification_scheduler so it can be done in parallel
        while True:
            total = Photo.objects.filter(last_thumbnailed_at__isnull=True).order_by('created_at').count()
            if total:
                print('{} photos remaining for thumbnailing'.format(total))
                photos = Photo.objects.filter(last_thumbnailed_at__isnull=True).order_by('created_at')[:100]
                print('{} queued photos for thumbnailing'. format(len(photos)))
                for photo in photos:
                    generate_thumbnails_for_photo(photo)
            sleep(5)

    def handle(self, *args, **options):
        try:
            self.run_scheduler()
        except KeyboardInterrupt:
            exit(0)
