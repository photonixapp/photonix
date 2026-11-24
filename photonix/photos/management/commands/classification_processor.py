from django.core.management.base import BaseCommand

from photonix.classifiers.model_manager import get_model_manager
from photonix.photos.utils.classification import SingleProcessClassifier
from photonix.web.utils import logger


class Command(BaseCommand):
    help = 'Runs every classifier in a single process, keeping at most one model loaded.'

    def run_processors(self):
        batch_size = 8

        # Start the model manager watchdog for idle unloading
        model_manager = get_model_manager()
        model_manager.start_watchdog()

        logger.info('Starting single-process classification processor with lazy loading')
        single_process_classifier = SingleProcessClassifier(batch_size=batch_size)
        single_process_classifier.run()

    def handle(self, *args, **options):
        self.run_processors()
