import queue
import threading
from time import sleep
import traceback

from django.db import transaction

from photonix.photos.models import Task, Photo
from photonix.photos.utils.tasks import requeue_stuck_tasks, requeue_memory_wait_tasks
from photonix.web.utils import logger


# Classifier priorities (higher = runs first, like k8s PriorityClass)
CLASSIFIER_PRIORITIES = {
    'color': 100,
    'location': 90,
    'face': 80,
    'style': 70,
    'object': 60,
    'event': 50,
}

# List of classifiers for iteration (order doesn't matter for execution)
CLASSIFIERS = list(CLASSIFIER_PRIORITIES.keys())


def process_classify_images_tasks():
    for task in Task.objects.filter(type='classify_images', status='P').order_by('created_at'):
        photo_id = task.subject_id
        generate_classifier_tasks_for_photo(photo_id, task)


def generate_classifier_tasks_for_photo(photo_id, task):
    task.start()

    # Add task for each classifier on current photo
    with transaction.atomic():
        library = Photo.objects.get(id=photo_id).library
        for classifier, priority in CLASSIFIER_PRIORITIES.items():
            Task(
                type='classify.{}'.format(classifier),
                subject_id=photo_id,
                parent=task,
                library=library,
                priority=priority,
            ).save()
        task.complete_with_children = True
        task.save()


class ThreadedQueueProcessor:
    """
    Processes classification tasks using a pool of worker threads.

    Supports two modes:
    1. Legacy mode: Pass a pre-loaded model instance via `model` parameter
    2. Lazy loading mode: Pass `model_class` and `model_name` to use ModelManager

    In lazy loading mode, models are loaded on first use and unloaded after idle timeout.
    """

    def __init__(self, model=None, task_type=None, runner=None, num_workers=4, batch_size=64,
                 model_class=None, model_name=None):
        """
        Initialize the processor.

        Args:
            model: Pre-loaded model instance (legacy mode, deprecated)
            task_type: Task type string (e.g., 'classify.object')
            runner: Function to run on each photo
            num_workers: Number of worker threads
            batch_size: Batch size for processing
            model_class: Model class for lazy loading (new mode)
            model_name: Classifier name for ModelManager (new mode)
        """
        self.model = model
        self.model_class = model_class
        self.model_name = model_name
        self.task_type = task_type
        self.runner = runner
        self.num_workers = num_workers
        self.batch_size = batch_size
        self.queue = queue.Queue()
        self.threads = []

        # Lazy loading mode
        self._use_lazy_loading = model_class is not None and model_name is not None
        self._model_manager = None
        if self._use_lazy_loading:
            from photonix.classifiers.model_manager import get_model_manager
            self._model_manager = get_model_manager()

    def __worker(self):
        while True:
            task = self.queue.get()

            if task is None:
                break

            self.__process_task(task)

            self.queue.task_done()

    def __process_task(self, task):
        # Import here to avoid circular imports
        from photonix.classifiers.model_manager import InsufficientMemoryError

        try:
            task.start()

            # Touch the model to reset idle timer before processing
            if self._use_lazy_loading and self._model_manager:
                self._model_manager.touch(self.model_name)

            photo, results = self.runner(task.subject_id)

            # Touch again after processing (in case it was slow)
            if self._use_lazy_loading and self._model_manager:
                self._model_manager.touch(self.model_name)

            task.complete()

            # Build tag summary for logging
            tag_summary = self._build_tag_summary(photo, results)
            photo_id = photo.id if photo else task.subject_id
            if tag_summary:
                logger.info(f'Completed: {task.type} [{photo_id}] - {tag_summary}')
            else:
                logger.info(f'Completed: {task.type} [{photo_id}]')

        except InsufficientMemoryError:
            # Expected during staggered startup - task will be requeued
            task.memory_wait()

        except Exception:
            logger.error(f'Error processing task: {task.type} - {task.subject_id}')
            traceback.print_exc()
            task.failed()

    def _build_tag_summary(self, photo, results):
        """Build a summary string of applied tags for logging."""
        if not results:
            return None

        tag_names = []

        # Handle different result formats from different classifiers
        if isinstance(results, dict):
            # Location classifier returns {'country': {...}, 'city': {...}}
            if results.get('country'):
                tag_names.append(results['country'].get('name', 'Unknown'))
            if results.get('city'):
                tag_names.append(results['city'].get('name', 'Unknown'))
        elif isinstance(results, list):
            for item in results[:5]:  # Limit to first 5 for brevity
                if isinstance(item, dict):
                    # Object classifier returns [{'label': ..., 'score': ...}, ...]
                    if 'label' in item:
                        tag_names.append(item['label'])
                    elif 'name' in item:
                        tag_names.append(item['name'])
                    elif 'box' in item:
                        # Face classifier returns [{'box': ..., 'confidence': ...}, ...]
                        # Tag names are assigned during processing, query from DB
                        pass  # Will be handled below
                elif isinstance(item, tuple) and len(item) >= 1:
                    # Color/style classifier returns [('name', score), ...]
                    tag_names.append(str(item[0]))
                elif isinstance(item, str):
                    # Event classifier returns ['event_name', ...]
                    tag_names.append(item)

            # Face classifier: get tag names from recently created PhotoTags
            if not tag_names and results and isinstance(results[0], dict) and 'box' in results[0]:
                if photo:
                    from photonix.photos.models import PhotoTag
                    face_tags = PhotoTag.objects.filter(
                        photo=photo, tag__type='F'
                    ).select_related('tag').order_by('-created_at')[:5]
                    tag_names = [pt.tag.name for pt in face_tags]

        if not tag_names:
            return None

        summary = ', '.join(tag_names)
        total_results = len(results) if isinstance(results, list) else 0
        if total_results > 5:
            summary += f' (+{total_results - 5} more)'

        return summary

    def __clean_up(self):
        # Shut down threads cleanly
        for i in range(self.num_workers):
            self.queue.put(None)
        for t in self.threads:
            t.join()

    def run(self, loop=True):
        logger.info('Starting {} {} workers'.format(self.num_workers, self.task_type))

        if self.num_workers > 1:
            for i in range(self.num_workers):
                t = threading.Thread(target=self.__worker)
                t.start()
                self.threads.append(t)

        try:
            while True:
                requeue_stuck_tasks(self.task_type)
                requeue_memory_wait_tasks(self.task_type)

                if self.task_type == 'classify.color':
                    task_queryset = Task.objects.filter(library__classification_color_enabled=True, type=self.task_type, status='P')
                elif self.task_type == 'classify.location':
                    task_queryset = Task.objects.filter(library__classification_location_enabled=True, type=self.task_type, status='P')
                elif self.task_type == 'classify.face':
                    task_queryset = Task.objects.filter(library__classification_face_enabled=True, type=self.task_type, status='P')
                elif self.task_type == 'classify.style':
                    task_queryset = Task.objects.filter(library__classification_style_enabled=True, type=self.task_type, status='P')
                elif self.task_type == 'classify.object':
                    task_queryset = Task.objects.filter(library__classification_object_enabled=True, type=self.task_type, status='P')
                else:
                    task_queryset = Task.objects.filter(type=self.task_type, status='P')
                for task in task_queryset[:8]:
                    if self.num_workers > 1:
                        self.queue.put(task)
                    else:
                        self.__process_task(task)

                if self.num_workers > 1:
                    self.queue.join()

                if not loop:
                    self.__clean_up()
                    return
                sleep(1)

        except KeyboardInterrupt:
            self.__clean_up()
