# Photonix Code Flow: The Lifecycle of a Photo

This document traces the code execution path for processing a single photo, from its initial detection on the filesystem to the completion of all analysis tasks. This flow illustrates the workings of the custom background job system.

The core pattern is a chain of **Scheduler** and **Processor** processes, which communicate via the `Task` table in the database.

## 1. File Detection and Initial Import

This is the entry point into the system.

*   **Process**: `watch_photos` (managed by `supervisord`)
*   **File**: `photonix/photos/management/commands/watch_photos.py`
*   **Code Flow**:
    1.  The `watch_photos()` method uses the `asyncinotify` library to monitor directories specified by `LibraryPath` models.
    2.  When a new file is created (e.g., a `CLOSE_WRITE` event), the `handle_inotify_events()` async function is triggered.
    3.  It calls `record_photo_async()`, an async wrapper around the `record_photo` function.
*   **Key Function**: `record_photo()` in `photonix/photos/utils/db.py`
    *   Extracts EXIF metadata from the image file.
    *   Creates the primary `Photo`, `PhotoFile`, `Camera`, and `Lens` database objects.
    *   **Crucially, it kicks off the entire background pipeline by creating a single `Task`:**
        ```python
        Task(type='ensure_raw_processed', subject_id=photo.id, ...).save()
        ```

## 2. RAW Processing Stage

This stage ensures there is a usable JPEG version of the photo, especially if the original is a camera RAW file.

### a. RAW Scheduling

*   **Process**: `raw_scheduler`
*   **File**: `photonix/photos/management/commands/raw_scheduler.py`
*   **Code Flow**:
    1.  The `run_scheduler()` method runs in a loop, polling the database for pending tasks of type `ensure_raw_processed`.
    2.  Query: `Task.objects.filter(type='ensure_raw_processed', status='P')`
    3.  When tasks are found, it calls `ensure_raw_processing_tasks()` from `photonix/photos/utils/raw.py`.
    4.  This utility function (not detailed here) is responsible for marking the `ensure_raw_processed` task as complete and creating a new `Task` with `type='process_raw'`.

### b. RAW Processing

*   **Process**: `raw_processor`
*   **File**: `photonix/photos/management/commands/raw_processor.py`
*   **Code Flow**:
    1.  This process is multi-threaded, using a `queue.Queue` to distribute work.
    2.  The main thread polls the database for pending tasks of type `process_raw`.
    3.  Query: `Task.objects.filter(type='process_raw', status='P')`
    4.  It puts the found tasks onto the queue.
    5.  Worker threads get tasks from the queue and call `process_raw_task()` from `photonix/photos/utils/raw.py`.
    6.  This utility function uses `dcraw` to convert the RAW file to a JPEG.
    7.  Upon completion, `process_raw_task` will create the **next task in the chain**, likely a `Task(type='thumbnail_scheduler')`.

## 3. Thumbnailing Stage

This stage follows the exact same scheduler/processor pattern as RAW processing.

1.  **`thumbnail_scheduler`**: Looks for photos that have been RAW-processed but not thumbnailed. It creates `Task`s of `type='process_thumbnail'`.
2.  **`thumbnail_processor`**: Picks up `process_thumbnail` tasks, generates the various thumbnail sizes specified in the settings, and saves them to the thumbnail storage path. Upon completion, it kicks off the next stage by creating a `Task(type='classification_scheduler')`.

## 4. Classification Stage (AI Analysis)

This is the final and most complex stage. It involves multiple parallel sub-tasks.

### a. Classification Scheduling

*   **Process**: `classification_scheduler`
*   **File**: `photonix/photos/management/commands/classification_scheduler.py`
*   **Code Flow**:
    1.  Polls for photos that have been thumbnailed but not yet classified.
    2.  For each photo, it does **not** create a single task. Instead, it creates **multiple** `Task`s in parallel, one for each type of enabled classifier.
    3.  Example tasks created:
        *   `Task(type='classification_object')`
        *   `Task(type='classification_color')`
        *   `Task(type='classification_face')`
        *   etc.

### b. Classification Processing

*   **Processes**: `classification_object_processor`, `classification_color_processor`, etc. (one for each type)
*   **Files**: `photonix/photos/management/commands/classification_*.py`
*   **Code Flow**:
    1.  Each processor is a dedicated worker that only looks for tasks of its specific type (e.g., `classification_object_processor` queries for `Task.objects.filter(type='classification_object', status='P')`).
    2.  When a task is found, the processor invokes the corresponding classifier model from the `photonix/classifiers/` directory (e.g., `photonix/classifiers/object/model.py`).
    3.  The classifier runs its analysis (e.g., a TensorFlow model) on the photo.
    4.  The results are saved to the database by creating `Tag` and `PhotoTag` objects, which link the analysis result (e.g., the tag "dog" with a confidence score) to the `Photo`.
    5.  The `Task` is marked as `Completed`. This is the end of the line for this branch of the processing chain.

This chained, database-driven task queue architecture allows for a sequential and parallel processing pipeline. However, its custom nature is the likely source of the performance and reliability issues reported by the user.
