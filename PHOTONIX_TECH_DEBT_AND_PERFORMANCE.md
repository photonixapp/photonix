# Photonix: Technical Debt and Performance Analysis

This document outlines the key areas of technical debt and the likely sources of the performance and reliability issues reported by users.

## 1. Core Issue: The Homegrown Background Job System

The most significant source of technical debt and the root cause of the system's instability is the custom-built background job queue. While functional for simple cases, it is brittle, opaque, and does not scale.

### 1.1. Architectural Flaws

*   **Brittle by Design**: The system is a complex interplay of `supervisord`, multiple Python processes, a PostgreSQL table acting as a queue (`Task`), and Redis for locking. A failure in any single component (e.g., a Redis connection drop, a bug in a scheduler) can cause the entire pipeline to halt or enter an inconsistent state.
*   **Inefficient Database Polling**: The "scheduler" and "processor" processes run in an infinite `while True:` loop, constantly querying the `Task` table (e.g., `sleep(1)`). This creates significant, unnecessary load on the PostgreSQL database, which will become a major bottleneck as the number of photos and tasks grows.
*   **Lack of Observability**: There is no user interface or built-in monitoring for the job queue. When a job gets "stuck", there is no way for a user to diagnose the problem, see the error message, or retry the task. This directly leads to the user's complaint of having to "reset the whole db and config" to recover.
*   **Prone to Race Conditions and Deadlocks**: While `python-redis-lock` is used, custom distributed lock management is notoriously difficult. The `requeue_stuck_tasks` function is a reactive patch for worker crashes, but it's not a substitute for a robust, atomic, and transactional queueing system. It may not handle all edge cases, leading to permanently stuck tasks.

### 1.2. Scalability Limitations

*   **Vertical Scaling Only**: The workers are multi-threaded but are confined to a single `supervisord` process on a single machine. The system cannot be scaled horizontally by adding more worker machines.
*   **Resource Contention**: All processors (RAW conversion, thumbnailing, and multiple heavy ML models) run on the same machine, competing for CPU, GPU (if any), and I/O resources. The use of the `nice` command in `supervisord.conf` is a strong indicator that the author was aware of this resource contention but lacked a proper architectural solution.

## 2. Lack of Robust Error Handling

*   **No Dead Letter Queue**: There is no concept of a "dead letter queue" for tasks that repeatedly fail. A single problematic photo could potentially get stuck in an infinite retry loop, consuming resources and preventing other photos from being processed.
*   **No Exponential Backoff**: The retry logic (if any) does not appear to use exponential backoff. Failed tasks are likely requeued immediately, which can hammer the system if the failure is due to a temporary external issue.

## 3. Outdated Dependencies

The project's dependencies are several years old across the entire stack.

*   **Backend**: `tensorflow==2.4.1`, `Django==3.2.12`.
*   **Frontend**: `react==16.13.0`, `react-scripts==3.4.0`.

This introduces significant risks:
*   **Security Vulnerabilities**: Old packages contain known, unpatched security vulnerabilities.
*   **Performance**: Newer versions of libraries like TensorFlow and Django often include significant performance optimizations.
*   **Bugs**: The project is likely affected by bugs that have since been fixed in newer releases.
*   **Maintenance Difficulty**: It is difficult to find documentation and community support for old library versions.

## 4. Insufficient Testing

While a `tests/` directory exists, the complexity and distributed nature of the background job system are extremely difficult to test effectively without a proper framework. It is highly likely that there is insufficient test coverage for the complex interactions between schedulers, processors, the database, and Redis. This leads to a lack of confidence when making changes and a high probability of regressions.

## 5. Minor UI Bugs

*   The malformed route for the `AlbumList` component found in `ui/src/components/App.js` indicates a lack of thorough testing and polish on the frontend. While minor, it is symptomatic of a larger potential for quality issues.
