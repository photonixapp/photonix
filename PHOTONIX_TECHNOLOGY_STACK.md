# Photonix Technology Stack

This document outlines the key technologies, frameworks, and libraries used in the Photonix project.

## Backend

The backend is a monolithic application built on the Django framework.

*   **Language:** Python 3
*   **Web Framework:** Django 3.2.12
*   **API Layer:** GraphQL, implemented with `graphene-django`.
*   **Authentication:** JSON Web Tokens (JWT) via `django-graphql-jwt`.
*   **Database ORM:** Django ORM
*   **WSGI Server:** Gunicorn

## Frontend

The frontend is a Single-Page Application (SPA) built with React.

*   **Language:** JavaScript (ES6+)
*   **UI Library:** React 16.13.0
*   **State Management:** Redux and `little-state-machine`
*   **Routing:** React Router
*   **GraphQL Client:** Apollo Client
*   **Component Library:** Chakra UI
*   **Build Tool/Bundler:** Webpack (via Create React App)
*   **Component Development:** Storybook

## Database

*   **Type:** Relational Database
*   **Implementation:** PostgreSQL 11.1
*   **Driver:** `psycopg2-binary`

## Caching & Background Jobs

*   **In-Memory Store:** Redis 6.2.2
*   **Functionality:** Used for both caching and as a backend for a custom-built, lock-based job queue (`python-redis-lock`).

## Machine Learning & Image Processing

The core "smart" features are powered by a suite of Python libraries.

*   **Core ML Framework:** TensorFlow 2.4.1
*   **Computer Vision:** OpenCV-Python
*   **Numerical Computation:** NumPy, SciPy
*   **Image Manipulation:** Pillow
*   **Vector Search:** Annoy (for Approximate Nearest Neighbor search)

## Infrastructure & Deployment

*   **Containerization:** Docker & Docker Compose
*   **Web Server / Reverse Proxy:** Nginx
*   **Process Manager:** Supervisord (used in the development environment to manage multiple services within a single container).
*   **File System Watching:** `inotify` (for automatically detecting new photos)

## Testing

*   **Backend Testing Framework:** PyTest with `pytest-django`
*   **Frontend Testing:** Jest (via Create React App)
*   **Mocking:** `mock`
*   **Test Data Generation:** `factory-boy`
