from django.core.management.base import BaseCommand

from photonix.classifiers.color import ColorModel, run_on_photo
from photonix.classifiers.model_manager import get_model_manager
from photonix.photos.utils.classification import ThreadedQueueProcessor
from photonix.web.utils import logger


class Command(BaseCommand):
    help = 'Runs the workers with the color classification model.'

    def run_processors(self):
        num_workers = 2
        batch_size = 8

        # Start the model manager watchdog for idle unloading
        model_manager = get_model_manager()
        model_manager.start_watchdog()

        logger.info('Starting color classification processor with lazy loading')
        threaded_queue_processor = ThreadedQueueProcessor(
            model_class=ColorModel,
            model_name='color',
            task_type='classify.color',
            runner=run_on_photo,
            num_workers=num_workers,
            batch_size=batch_size
        )
        threaded_queue_processor.run()

    def handle(self, *args, **options):
        self.run_processors()
