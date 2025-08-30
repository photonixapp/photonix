# Photonix: Detailed Requirement Document

This document specifies the functional and non-functional requirements for the Photonix application. It covers both the existing capabilities and a proposed set of new requirements to address the system's current shortcomings.

## 1. Existing Functional Requirements

These are the features currently implemented in the application.

*   **FR-1: User Authentication**: The system shall allow users to create an account, log in, and log out.
*   **FR-2: Library Management**: Users shall be able to create and configure at least one photo library.
*   **FR-3: Photo Importing**: The system shall automatically import photos from a configured local filesystem path.
*   **FR-4: EXIF Data Extraction**: The system shall automatically read and store EXIF metadata from photos (e.g., date taken, camera model, GPS coordinates).
*   **FR-5: AI-Based Photo Analysis**: The system shall automatically analyze photos to generate tags for:
    *   Colors
    *   Locations (reverse geocoding)
    *   Image Style/Aesthetics
    *   Objects
    *   Faces
*   **FR-6: Photo Browsing**: Users shall be able to browse their photo collection in a grid view with infinite scrolling.
*   **FR-7: Photo Viewing**: Users shall be able to view a single photo in a detailed modal view, including its metadata and tags.
*   **FR-8: Search and Filtering**: Users shall be able to search for photos and filter them based on various criteria (e.g., tags, ratings, dates).
*   **FR-9: Manual Tagging**: Users shall be able to add and remove their own tags from photos.
*   **FR-10: Photo Rating**: Users shall be able to assign a star rating (1-5) to photos.

## 2. Existing Non-Functional Requirements (Implicit)

These are the current, often inadequate, non-functional characteristics of the system.

*   **NFR-1 (Performance)**: The system is slow, with photo processing taking an unacceptably long time for large batches.
*   **NFR-2 (Reliability)**: The system is unreliable. Background jobs frequently get stuck, requiring manual intervention (e.g., database reset) to resolve.
*   **NFR-3 (Scalability)**: The system is not scalable. Its performance is limited to the resources of a single machine.
*   **NFR-4 (Usability)**: The core UI is functional, but the lack of visibility into the background processing makes it difficult for users to trust and manage.
*   **NFR-5 (Security)**: The system uses outdated dependencies with known security vulnerabilities.

## 3. Proposed New & Improved Functional Requirements

*   **FR-NEW-1: Job Monitoring Dashboard**: The system **must** provide a web interface where users can:
    *   View the real-time status of all background jobs (pending, in-progress, completed, failed).
    *   Inspect the logs and error messages for a specific failed job.
    *   Manually trigger a retry for a failed job.
    *   See overall queue statistics (e.g., number of pending jobs).
*   **FR-NEW-2: Robust Album Management**: The system shall provide a fully functional UI for creating, viewing, renaming, and deleting albums. Users shall be able to add and remove photos from albums.
*   **FR-NEW-3: Photo Sharing**: Users shall be able to generate a unique, shareable public link for a single photo or an entire album.
*   **FR-NEW-4: Granular User Permissions**: The system should allow library owners to share their library with other users with read-only permissions.

## 4. Proposed New & Improved Non-Functional Requirements

These requirements will guide the refactoring effort.

*   **NFR-NEW-1 (Performance)**:
    *   The system must be able to import and fully process at least 1000 photos per hour on a standard 4-core CPU system.
    *   API response times for common operations (e.g., search) must be under 500ms.
*   **NFR-NEW-2 (Reliability)**:
    *   The background job system **must** be resilient to worker crashes. A single failed job must not halt the entire processing pipeline.
    *   Failed jobs must be automatically retried using an exponential backoff strategy (e.g., retry after 1 min, then 5 mins, then 15 mins).
    *   Jobs that fail consistently after a set number of retries (e.g., 5 times) must be moved to a "dead letter queue" for manual inspection via the Job Monitoring Dashboard.
*   **NFR-NEW-3 (Scalability)**: The architecture **must** support horizontal scaling. It should be possible to increase processing throughput by adding more worker containers, potentially on different machines.
*   **NFR-NEW-4 (Observability & Maintainability)**:
    *   The system must produce structured logs for all components.
    *   The status of the job queue (e.g., queue length, processing times) must be exposed as metrics that can be scraped by a monitoring system like Prometheus.
*   **NFR-NEW-5 (Security)**: All third-party dependencies (backend and frontend) **must** be updated to their latest stable and secure versions. A process for regularly updating dependencies should be established.
