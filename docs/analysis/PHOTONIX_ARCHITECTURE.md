# Photonix System Architecture

This document describes the architecture of the Photonix application, detailing its components and how they interact.

## 1. High-Level Overview

Photonix is a multi-component, containerized web application. At a high level, the architecture consists of three main services orchestrated by Docker Compose:

1.  **PostgreSQL Database**: The primary data store for all application data.
2.  **Redis Server**: Used for caching and as a locking mechanism for the background job system.
3.  **Photonix Application**: The core application container, which itself runs multiple internal processes to handle web requests, background tasks, and user interface rendering.

The architecture is designed to separate concerns, with a distinct frontend, backend, and a set of background workers for handling long-running, computationally expensive tasks like image analysis.

## 2. Containerized Services (Docker Compose)

The entire system is designed to be run as a set of interconnected Docker containers.

*   **`postgres` service**:
    *   Runs a standard `postgres:11.1-alpine` image.
    *   Acts as the persistent data store for the application, storing all information about users, libraries, photos, tags, and task states in the PostgreSQL database.

*   **`redis` service**:
    *   Runs a standard `redis:6.2.2` image.
    *   Serves two main purposes:
        1.  **Caching**: Provides a fast in-memory cache for Django.
        2.  **Distributed Locking**: Used by the background job system (`python-redis-lock`) to prevent multiple workers from processing the same task simultaneously.

*   **`photonix` service**:
    *   This is the main application container, built from a custom `Dockerfile`.
    *   It does not run a single process, but rather uses `supervisord` to manage a suite of internal processes. This container houses the Django backend, the React frontend, and all the background workers.

## 3. Application Container Internals (`supervisord` processes)

The `photonix` container is a complex environment where multiple processes run concurrently, managed by `supervisord`. These can be grouped into three categories:

### a. Web Serving Stack

These processes handle user-facing interactions.

*   **`nginx`**: Acts as a reverse proxy, directing traffic. It serves the static files of the React frontend directly and proxies API requests to the application server.
*   **`app_server` (Gunicorn)**: The main Python application server that runs the Django backend and serves the GraphQL API.
*   **`webpack`**: (In development) A Node.js process that runs the Webpack Dev Server for the React UI, providing hot-reloading for frontend development.
*   **`storybook`**: (In development) A Node.js process for running Storybook, a UI component development environment.

### b. File System Monitoring

This process is the entry point for new photos into the system.

*   **`watch_photos`**: A long-running Django management command that uses `inotify` to watch the photo import directories for new files. When a new file is detected, it creates the initial `Photo` and `PhotoFile` records in the database and kicks off the processing pipeline by creating a `Task`.

### c. Background Job System (Homegrown Task Queue)

This is the most complex part of the architecture, responsible for all photo processing. It is a custom-built task queue system that uses the PostgreSQL database for task state management and Redis for locking.

*   **The `Task` Model**: A database table that acts as the queue. Each row represents a job to be done, with a `type`, `subject_id`, and `status` (Pending, Started, Completed, Failed).

*   **"Scheduler" Processes**:
    *   `raw_scheduler`, `thumbnail_scheduler`, `classification_scheduler`
    *   These are long-running processes that periodically query the database for photos that need processing. They act as "job creators", populating the `Task` table with new work to be done. For example, the `classification_scheduler` will create a separate `Task` for each type of AI analysis (color, object, face, etc.) for a given photo.

*   **"Processor" (Worker) Processes**:
    *   `raw_processor`, `thumbnail_processor`, `classification_color_processor`, `classification_object_processor`, etc.
    *   Each of these is a dedicated worker process that handles one specific type of task.
    *   It queries the `Task` table for a `Pending` task of its type.
    *   It acquires a Redis lock for the task's subject to ensure exclusive processing.
    *   It performs the work (e.g., runs a TensorFlow model).
    *   It updates the `Task` status to `Completed` or `Failed` and saves the results to the database (e.g., as `Tag`s and `PhotoTag`s).

## 4. Component Interaction & Data Flow (Photo Processing Pipeline)

1.  A user places a new photo file into a library's import directory.
2.  The **`watch_photos`** process detects the new file via `inotify`.
3.  `watch_photos` creates a `Photo` record in the **PostgreSQL** database and creates a corresponding `Task` (e.g., `type='raw_scheduler'`) to begin processing.
4.  A **scheduler process** (e.g., `classification_scheduler`) queries the database, finds the photo needs analysis, and creates multiple new `Task`s in the database (e.g., `type='classification_object'`, `type='classification_color'`).
5.  A **processor process** (e.g., `classification_object_processor`) queries the database for a pending task.
6.  It finds the task, acquires a lock from the **Redis** server, and begins processing the photo file.
7.  The processor runs its analysis (e.g., a TensorFlow model) and generates results.
8.  The results are saved back to the **PostgreSQL** database (e.g., new `Tag` and `PhotoTag` records).
9.  The processor updates the `Task`'s status to `Completed` and releases the Redis lock.
10. Meanwhile, the user interacts with the web UI, which is served by **Nginx**. The UI makes API calls to the **Gunicorn/Django** server to fetch data and display the results of the processing.
