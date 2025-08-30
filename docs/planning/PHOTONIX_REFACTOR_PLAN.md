# Photonix: A High-Level Refactoring and Improvement Plan

This document presents a strategic plan to refactor the Photonix application. The primary goals are to fix the core reliability and performance issues, modernize the technology stack, and pave the way for future feature development.

The plan is divided into three phases, ordered by priority.

---

## Phase 1: Stabilize the Foundation

This phase is critical and must be completed first. It replaces the single largest source of technical debt: the homegrown background job system.

### 1. Replace the Background Job System with Celery

*   **Action**: The entire system of custom "scheduler" and "processor" management commands, along with the `Task` database model, must be removed.
*   **Technology**: This system will be replaced with **Celery**, a robust, industry-standard distributed task queue for Python. Redis, which is already part of the stack, will be used as the message broker.
*   **Implementation Steps**:
    1.  Integrate the `celery` library into the Django project.
    2.  Convert each processing step (e.g., RAW conversion, thumbnailing, object classification) into a self-contained Celery task.
    3.  Use Celery's powerful "canvas" primitives (e.g., `chain`, `group`, `chord`) to define the photo processing pipeline in code. This replaces the brittle, database-driven scheduling logic. A typical pipeline for a new photo might look like this: `chain(process_raw_task.s(photo_id), generate_thumbnails_task.s(), group(classify_object_task.s(), classify_color_task.s(), ...))`.
*   **Outcome**: This single change will provide immense benefits: proven reliability, automatic retries with exponential backoff, a clear path to horizontal scalability, and better error handling.

### 2. Implement a Job Monitoring Dashboard

*   **Action**: Deploy a user-facing dashboard to monitor the status of the Celery tasks.
*   **Technology**: Use **Flower**, a real-time, web-based monitoring tool for Celery. It is simple to integrate and provides immediate visibility into running tasks, worker status, and queue length.
*   **Outcome**: This directly addresses the user's biggest pain point by making the background processing transparent and manageable.

### 3. Update All Dependencies

*   **Action**: Systematically update all dependencies in `requirements.txt` and `ui/package.json` to their latest stable and secure versions.
*   **Outcome**: This patches known security vulnerabilities, brings in performance improvements and bug fixes from upstream libraries, and makes the project easier to maintain. This must be done in conjunction with the Celery migration, as it will likely involve breaking changes.

### 4. Improve Logging and Observability

*   **Action**: Implement structured logging (e.g., JSON format) throughout the application, especially within the new Celery tasks. Ensure Celery workers and the Django app output detailed, useful logs.
*   **Outcome**: Dramatically simplifies debugging and tracing the lifecycle of a photo through the new processing pipeline.

---

## Phase 2: Enhance and Test

With a stable foundation in place, the focus shifts to improving quality and implementing highly-requested features.

### 1. Add Comprehensive Test Coverage

*   **Action**: Write a suite of integration tests for the new Celery-based pipeline. These tests should cover both success scenarios and failure cases (e.g., a corrupted image file, a classifier that throws an error).
*   **Action**: Increase the unit test coverage for key backend and frontend components.

### 2. Fix Known UI Bugs

*   **Action**: Address the known UI issues, starting with the malformed route for the `AlbumList` component in the React application.

### 3. Implement Core Missing Features

*   **Action**: Build out the most-requested features that rely on a stable backend, such as:
    *   A fully functional Album Management system.
    *   The ability to share photos or albums via public links.

---

## Phase 3: Modernize and Expand

This phase focuses on longer-term, strategic improvements.

### 1. Optimize Machine Learning Models

*   **Action**: Profile the performance of the various TensorFlow classification models. Investigate converting them to a more performant format like ONNX or using a newer, more efficient model architecture.

### 2. Implement Strategic Features

*   **Action**: With a stable and scalable platform, development can begin on major new features that expand the project's vision, such as:
    *   A mobile application for photo viewing and automatic uploads.
    *   Integration with cloud storage providers.
    *   Interactive AI training features.
