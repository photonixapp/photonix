from django.core.management.base import BaseCommand

# Pre-load the model graphs so it doesn't have to be done for each job
from photonix.classifiers.style import StyleModel, run_on_photo
from photonix.photos.utils.classification import ThreadedQueueProcessor
from photonix.web.utils import logger


logger.debug('Loading style classification model')
model = StyleModel()


class Command(BaseCommand):
    help = 'Runs the workers with the style classification model.'

    def run_processors(self):
        num_workers = 1
        batch_size = 64
        threaded_queue_processor = ThreadedQueueProcessor(model, 'classify.style', run_on_photo, num_workers, batch_size)
        threaded_queue_processor.run()

    def handle(self, *args, **options):
        self.run_processors()
