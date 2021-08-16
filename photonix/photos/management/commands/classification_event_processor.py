from django.core.management.base import BaseCommand

# Pre-load the model graphs so it doesn't have to be done for each job
from photonix.classifiers.event import EventModel, run_on_photo
from photonix.photos.utils.classification import ThreadedQueueProcessor
from photonix.web.utils import logger


logger.debug('Loading event model')
model = EventModel()


class Command(BaseCommand):
    help = 'Runs the workers with the event classification model.'

    def run_processors(self):
        num_workers = 1
        batch_size = 64
        threaded_queue_processor = ThreadedQueueProcessor(model, 'classify.event', run_on_photo, num_workers, batch_size)
        threaded_queue_processor.run()

    def handle(self, *args, **options):
        self.run_processors()
