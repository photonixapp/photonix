import os
from time import sleep

from django.core.management.base import BaseCommand
from django.utils import timezone
import redis
from rq import Queue

from photos.models import Photo


r = redis.Redis(host=os.environ.get('REDIS_HOST', '127.0.0.1'))
color_queue = Queue('classification_color', connection=r)
object_queue = Queue('classification_object', connection=r)
style_queue = Queue('classification_style', connection=r)


class Command(BaseCommand):
    help = 'Loads unclassified photos onto the classification queues for processing.'

    def run_scheduler(self):
        while True:
            # Color queue
            print('{} items in color_queue'.format(len(color_queue)))
            if len(color_queue) == 0:
                total = Photo.objects.filter(classifier_color_queued_at__isnull=True).order_by('created_at').count()
                if total:
                    print('{} photos remaining for color classificaion'.format(total))
                    photos = Photo.objects.filter(classifier_color_queued_at__isnull=True).order_by('created_at')[:100]
                    print('{} queued photos for color classification'. format(len(photos)))
                    for photo in photos:
                        photo.classifier_color_queued_at = timezone.now()
                        photo.save()
                        color_queue.enqueue('classifiers.runners.run_color_classifier_on_photo', photo.id, timeout=600)

            # Object queue
            print('{} items in object_queue'.format(len(object_queue)))
            if len(object_queue) == 0:
                total = Photo.objects.filter(classifier_object_queued_at__isnull=True).order_by('created_at').count()
                if total:
                    print('{} photos remaining for object classificaion'.format(total))
                    photos = Photo.objects.filter(classifier_object_queued_at__isnull=True).order_by('created_at')[:10]
                    print('{} queued photos for object classification'. format(len(photos)))
                    for photo in photos:
                        photo.classifier_object_queued_at = timezone.now()
                        photo.save()
                        object_queue.enqueue('classifiers.runners.run_object_classifier_on_photo', photo.id, timeout=600)

            # Style queue
            print('{} items in style_queue'.format(len(style_queue)))
            if len(style_queue) == 0:
                total = Photo.objects.filter(classifier_style_queued_at__isnull=True).order_by('created_at').count()
                if total:
                    print('{} photos remaining for style classificaion'.format(total))
                    photos = Photo.objects.filter(classifier_style_queued_at__isnull=True).order_by('created_at')[:100]
                    print('{} queued photos for style classification'. format(len(photos)))
                    for photo in photos:
                        photo.classifier_style_queued_at = timezone.now()
                        photo.save()
                        style_queue.enqueue('classifiers.runners.run_style_classifier_on_photo', photo.id, timeout=600)

            print('')
            sleep(5)

    def handle(self, *args, **options):
        try:
            self.run_scheduler()
        except KeyboardInterrupt:
            exit(0)