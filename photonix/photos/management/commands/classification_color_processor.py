from django.core.management.base import BaseCommand

# Pre-load the model graphs so it doesn't have to be done for each job
from photonix.classifiers.color import ColorModel, run_on_photo
from photonix.photos.utils.classification import ThreadedQueueProcessor
from photonix.web.utils import logger


logger.debug('Loading color model')
model = ColorModel()


class Command(BaseCommand):
    help = 'Runs the workers with the color classification model.'

    def run_processors(self):
        num_workers = 1
        batch_size = 64
        threaded_queue_processor = ThreadedQueueProcessor(model, 'classify.color', run_on_photo, num_workers, batch_size)
        threaded_queue_processor.run()

    def handle(self, *args, **options):
        self.run_processors()
