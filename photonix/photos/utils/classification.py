from importlib import import_module
import queue
import sys
import threading
from time import sleep
import traceback

from django.db import transaction

from photonix.photos.models import Library, Task, Photo
from photonix.photos.utils.tasks import requeue_stuck_tasks, requeue_memory_wait_tasks, requeue_delayed_tasks
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
    if not task.claim():
        return  # Another processor replica claimed this task first

    # Add task for each enabled classifier on current photo
    num_created = 0
    with transaction.atomic():
        library = Photo.objects.get(id=photo_id).library
        for classifier, priority in CLASSIFIER_PRIORITIES.items():
            # Don't create tasks that no processor will pick up - they would
            # stay Pending forever and block this parent task's completion.
            # Classifiers without a library toggle (event) are always enabled.
            if not getattr(library, f'classification_{classifier}_enabled', True):
                continue
            Task(
                type='classify.{}'.format(classifier),
                subject_id=photo_id,
                parent=task,
                library=library,
                priority=priority,
            ).save()
            num_created += 1
        if num_created:
            task.complete_with_children = True
            task.save()

    if not num_created:
        task.complete()


def pending_tasks_for(task_type):
    """Pending tasks of this type whose library has the classifier enabled.

    Classifiers without a Library toggle (e.g. event) are always enabled.
    """
    queryset = Task.objects.filter(type=task_type, status='P')
    if task_type.startswith('classify.'):
        toggle = 'classification_{}_enabled'.format(task_type.split('.', 1)[1])
        if toggle in {field.name for field in Library._meta.get_fields()}:
            queryset = queryset.filter(**{'library__{}'.format(toggle): True})
    return queryset


def get_classifier_spec(name):
    """Lazy import of photonix.classifiers.<name>; returns (model_class, run_on_photo)."""
    module = import_module('photonix.classifiers.{}'.format(name))
    return getattr(module, '{}Model'.format(name.capitalize())), module.run_on_photo


def exit_idle_process():
    """Exit so supervisord restarts the program with a fresh process.

    Unloading a model does not return its memory to the OS, so exiting is the
    only way to release it. Call only from the main thread between batches.
    """
    logger.info('Exiting idle classifier process to release memory')
    sys.exit(0)


def process_classification_task(task, runner, model_name=None, model_manager=None):
    """Claim, run and complete one classification task.

    Shared by ThreadedQueueProcessor and SingleProcessClassifier. An
    InsufficientMemoryError puts the task into memory-wait; any other error
    marks it Failed.
    """
    # Import here to avoid circular imports
    from photonix.classifiers.model_manager import InsufficientMemoryError

    try:
        if not task.claim():
            return  # Another processor replica claimed this task first

        # Touch the model to reset idle timer before processing
        if model_manager and model_name:
            model_manager.touch(model_name)

        photo, results = runner(task.subject_id)

        # Touch again after processing (in case it was slow)
        if model_manager and model_name:
            model_manager.touch(model_name)

        task.complete()

        # Build tag summary for logging
        tag_summary = build_tag_summary(photo, results)
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


def build_tag_summary(photo, results):
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
        process_classification_task(
            task, self.runner,
            model_name=self.model_name if self._use_lazy_loading else None,
            model_manager=self._model_manager if self._use_lazy_loading else None)

    def _build_tag_summary(self, photo, results):
        return build_tag_summary(photo, results)

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
                requeue_delayed_tasks(self.task_type)

                task_queryset = pending_tasks_for(self.task_type)
                for task in task_queryset[:8]:
                    if self.num_workers > 1:
                        self.queue.put(task)
                    else:
                        self.__process_task(task)

                if self.num_workers > 1:
                    self.queue.join()

                # Between batches, with no task in flight
                if self._use_lazy_loading and self._model_manager.should_exit_when_idle():
                    self.__clean_up()
                    exit_idle_process()

                if not loop:
                    self.__clean_up()
                    return
                sleep(1)

        except KeyboardInterrupt:
            self.__clean_up()


class SingleProcessClassifier:
    """
    Runs every classifier in one process, keeping at most one model loaded.

    Also does the scheduler's job of expanding classify_images tasks, so in the
    low-memory layout it replaces classification_scheduler and the six
    per-classifier processes. Tasks are processed on the main thread.
    """

    def __init__(self, classifiers=CLASSIFIERS, batch_size=8):
        from photonix.classifiers.model_manager import get_model_manager

        self.classifiers = list(classifiers)
        self.task_types = ['classify.{}'.format(name) for name in self.classifiers]
        self.batch_size = batch_size
        self._specs = {}
        self._model_manager = get_model_manager()
        # The load cooldown staggers model loading across several classifier
        # processes. With a single process that unloads its previous model
        # before loading the next, it would only put each switch of task type
        # into memory-wait.
        self._model_manager.set_load_cooldown(0)

    def _spec(self, name):
        if name not in self._specs:
            self._specs[name] = get_classifier_spec(name)
        return self._specs[name]

    def next_task(self):
        """The next pending task to process.

        While a model is loaded and its type still has pending enabled tasks,
        stay on that type, so newly queued higher-priority tasks (e.g. color
        during an import) don't force a large model to be unloaded and
        reloaded repeatedly. Otherwise the first pending task across all
        enabled classifier types in priority order.
        """
        for loaded_name in self._model_manager.get_status():
            if loaded_name in self.classifiers:
                task = pending_tasks_for('classify.{}'.format(loaded_name)).order_by(
                    '-priority', 'created_at').first()
                if task:
                    return task

        queryset = None
        for task_type in self.task_types:
            pending = pending_tasks_for(task_type)
            queryset = pending if queryset is None else queryset | pending
        if queryset is None:
            return None
        return queryset.order_by('-priority', 'created_at').first()

    def run_once(self):
        """One pass: expand classify_images tasks, then process one batch of a
        single classifier type. Returns the number of tasks attempted.

        Raises SystemExit(0) instead of switching to a different model type
        when CLASSIFIER_EXIT_WHEN_IDLE is on (see exit_idle_process)."""
        process_classify_images_tasks()
        for task_type in self.task_types:
            requeue_stuck_tasks(task_type)
            requeue_memory_wait_tasks(task_type)
            requeue_delayed_tasks(task_type)

        task = self.next_task()
        if not task:
            return 0

        name = task.type.split('.', 1)[1]
        # At most one model resident: unload any other before this one loads
        for loaded_name in list(self._model_manager.get_status()):
            if loaded_name != name:
                self._model_manager.unload_model(loaded_name)

        # An unload still running (the watchdog's idle unload) has already
        # removed its model from get_status() but may still be clearing the
        # TensorFlow session. Don't load alongside it; the next pass decides.
        if self._model_manager.unload_in_progress():
            return 0

        # Unloading returns no memory to the OS, so loading the next model in
        # this process would stack it on top of what the previous one left
        # behind. With idle exit on, a process that has loaded a model and now
        # has none (whether this pass or the watchdog unloaded it) exits
        # instead (no task in flight) and supervisord starts a fresh process,
        # which loads the next type. A process that has not loaded anything
        # yet loads normally, so this cannot loop.
        if self._model_manager.should_exit_when_idle():
            exit_idle_process()

        _, runner = self._spec(name)
        tasks = list(pending_tasks_for(task.type)[:self.batch_size])
        for batch_task in tasks:
            process_classification_task(
                batch_task, runner, model_name=name, model_manager=self._model_manager)
        return len(tasks)

    def run(self, loop=True):
        logger.info('Starting single-process classifier for {}'.format(', '.join(self.classifiers)))
        try:
            while True:
                self.run_once()

                # Between batches, on the main thread, with no task in flight
                if self._model_manager.should_exit_when_idle():
                    exit_idle_process()

                if not loop:
                    return
                sleep(1)
        except KeyboardInterrupt:
            return
