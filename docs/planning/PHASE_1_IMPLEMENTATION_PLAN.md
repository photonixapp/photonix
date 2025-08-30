# Phase 1 Implementation Plan: Stabilizing the Foundation

This document provides a detailed, actionable plan for executing Phase 1 of the Photonix refactoring effort. The goal of this phase is to replace the unreliable, custom-built job queue with an industry-standard solution, update all dependencies, and establish a stable foundation for future development.

Each section should be treated as a separate task and, ideally, a separate pull request.

---

### Task 1.1: Initial Celery & Flower Integration

*   **Goal**: Add Celery and its monitoring dashboard, Flower, to the project. Confirm that a basic "hello world" task can be executed successfully.
*   **Key File Modifications**:
    *   `requirements.txt`: Add `celery` and `flower`.
    *   `docker-compose.dev.yml`: Add a new `worker` service for Celery and a `flower` service. Expose the Flower dashboard port (e.g., 5555).
    *   `system/supervisord.conf`: Remove all the old `scheduler` and `processor` programs. The new Celery worker will be managed by its own Docker service.
    *   Create `photonix/celery.py`: This file will contain the Celery application instance configuration.
    *   `photonix/web/settings.py`: Add Celery broker configuration (pointing to the Redis service).
*   **Acceptance Criteria**:
    1.  The application starts successfully with `make start`.
    2.  A new `photonix-worker-1` container is running.
    3.  The Flower dashboard is accessible in a browser (e.g., at `http://localhost:5555`) and shows the worker online.
    4.  A developer can manually trigger a test task from the Django shell and see it execute successfully in the Flower dashboard.

---

### Task 1.2: Migrate RAW Processing to a Celery Task

*   **Goal**: Replace the `raw_scheduler` and `raw_processor` commands with a single Celery task.
*   **Key File Modifications**:
    *   Create `photonix/photos/tasks.py`.
    *   Define a new `process_raw_task` Celery task in `tasks.py`, moving the logic from `photonix/photos/utils/raw.py` into it.
    *   Modify `photonix/photos/utils/db.py`: The `record_photo` function should now dispatch the `process_raw_task.delay(photo_id)` instead of creating a `Task` model instance.
    *   Delete `photonix/photos/management/commands/raw_scheduler.py`.
    *   Delete `photonix/photos/management/commands/raw_processor.py`.
*   **Acceptance Criteria**:
    1.  When a new photo is added to the library, a `process_raw_task` is created and visible in Flower.
    2.  The task executes successfully, and the RAW photo is converted to a JPEG.
    3.  The old scheduler/processor commands are gone.

---

### Task 1.3: Migrate Thumbnailing to a Celery Task

*   **Goal**: Replace the `thumbnail_scheduler` and `thumbnail_processor` with a Celery task, chained to the RAW processing task.
*   **Key File Modifications**:
    *   `photonix/photos/tasks.py`: Define a new `generate_thumbnails_task`.
    *   Modify the `process_raw_task`: Upon successful completion, it should trigger the `generate_thumbnails_task`. This should be done using a Celery `chain`.
    *   Delete `photonix/photos/management/commands/thumbnail_scheduler.py`.
    *   Delete `photonix/photos/management/commands/thumbnail_processor.py`.
*   **Acceptance Criteria**:
    1.  After a photo's RAW processing is complete, a `generate_thumbnails_task` is automatically dispatched.
    2.  Thumbnails are generated correctly.

---

### Task 1.4: Migrate All AI Classifiers to Celery

*   **Goal**: Replace all `classification_*` schedulers and processors with a group of parallel Celery tasks.
*   **Key File Modifications**:
    *   `photonix/photos/tasks.py`: Define a separate Celery task for each classifier (e.g., `classify_object_task`, `classify_color_task`).
    *   Modify the `generate_thumbnails_task`: Upon successful completion, it should trigger all the classification tasks to run in parallel using a Celery `group`.
    *   Delete all `classification_*` management command files.
*   **Acceptance Criteria**:
    1.  After thumbnailing is complete, all classification tasks are dispatched simultaneously.
    2.  All tasks execute successfully and the photo is tagged with the AI-generated data.
    3.  The `Task` model in `photos/models.py` can now be safely deleted, along with its migrations.

---

### Task 1.5: Update Dependencies

*   **Goal**: Bring all project dependencies up to their latest stable and secure versions.
*   **Key File Modifications**:
    *   `requirements.txt`: Run a tool like `pip-review` or `pip-tools` to update all Python packages.
    *   `ui/package.json`: Run `npm outdated` and `npm update` (or `yarn` equivalents) to update all frontend packages.
*   **Acceptance Criteria**:
    1.  All dependencies are updated to their latest major stable versions.
    2.  The application builds and runs correctly with the new packages.
    3.  All existing automated tests pass. This task may require significant work to fix breaking changes introduced by the updates. It should be done on a separate branch.
