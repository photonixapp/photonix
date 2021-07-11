import queue
import threading
from time import sleep
import traceback

from django.db import transaction
from django.utils import timezone

from photonix.photos.models import Task, Photo
from photonix.photos.utils.tasks import requeue_stuck_tasks
from photonix.web.utils import logger


CLASSIFIERS = [
    'color',
    'event',
    'location',
    'face',
    'style',
    'object',
]


def process_classify_images_tasks():
    for task in Task.objects.filter(type='classify_images', status='P').order_by('created_at'):
        photo_id = task.subject_id
        generate_classifier_tasks_for_photo(photo_id, task)


def generate_classifier_tasks_for_photo(photo_id, task):
    task.start()
    started = timezone.now()

    # Add task for each classifier on current photo
    with transaction.atomic():
        for classifier in CLASSIFIERS:
            Task(
                type='classify.{}'.format(classifier), subject_id=photo_id,
                parent=task, library=Photo.objects.get(id=photo_id).library
            ).save()
        task.complete_with_children = True
        task.save()


class ThreadedQueueProcessor:
    def __init__(self, model=None, task_type=None, runner=None, num_workers=4, batch_size=64):
        self.model = model
        self.task_type = task_type
        self.runner = runner
        self.num_workers = num_workers
        self.batch_size = batch_size
        self.queue = queue.Queue()
        self.threads = []

    def __worker(self):
        while True:
            task = self.queue.get()

            if task is None:
                break

            self.__process_task(task)

            self.queue.task_done()

    def __process_task(self, task):
        try:
            logger.info(f'Running task: {task.type} - {task.subject_id}')
            task.start()
            self.runner(task.subject_id)
            task.complete()
        except Exception:
            logger.error(f'Error processing task: {task.type} - {task.subject_id}')
            traceback.print_exc()
            task.failed()

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
                        logger.debug('putting task')
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
