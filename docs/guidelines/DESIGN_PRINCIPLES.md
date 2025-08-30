# Design Principles

This document outlines the high-level architectural and design principles for the Photonix project. All new development and refactoring work must adhere to these principles to ensure the system remains coherent, scalable, and maintainable.

## 1. Architecture

*   **Service-Oriented**: The application is a set of containerized services, orchestrated by Docker Compose. The primary services are the Django web application, a PostgreSQL database, and a Redis server.
*   **Backend Framework**: The backend is built using the **Django** framework. It is responsible for all business logic, database interactions, and serving the API.
*   **Frontend Framework**: The frontend is a **React** Single-Page Application (SPA). It is responsible for all rendering and user interaction in the browser.
*   **API**: The frontend and backend communicate exclusively via a **GraphQL API**. All new backend functionality intended for the UI must be exposed through the GraphQL schema.
*   **Containerization**: All development and production environments **must** be managed through **Docker**. All necessary services must be defined in the `docker-compose` files.

## 2. Background Task Processing

*   **The Golden Rule**: The custom, database-polling job queue is deprecated and **must not** be used for any new features. All asynchronous, long-running, or computationally expensive tasks **must** be implemented as **Celery** tasks.
*   **Task Definition**: Celery tasks should be defined in a `tasks.py` file within the relevant Django app (e.g., `photonix/photos/tasks.py`).
*   **Task Orchestration**: Complex workflows involving multiple steps should be orchestrated using Celery's canvas primitives (`chain`, `group`, `chord`) rather than manual, database-driven state management.
*   **Monitoring**: The health and status of the background job queue will be monitored using **Flower**.

## 3. Database

*   **Primary Key Strategy**: All new database models **must** use a `UUIDField` as their primary key, typically by inheriting from the `UUIDModel` base class. Auto-incrementing integer IDs are not to be used for primary keys.
*   **Timestamps**: All new models that represent a logical entity should inherit from the `VersionedModel` base class to automatically get `created_at` and `updated_at` fields.
*   **Migrations**: All database schema changes **must** be made through Django's migration system (`manage.py makemigrations` and `manage.py migrate`).

## 4. State Management

*   **Backend**: The PostgreSQL database is the single source of truth for all persistent data.
*   **Frontend**:
    *   **Server Cache**: Apollo Client is used for managing the cache of data fetched from the GraphQL API.
    *   **Global UI State**: Redux is used for managing global UI state that is not directly tied to server data (e.g., layout state, filter settings). New global state should be added to the appropriate Redux store.
