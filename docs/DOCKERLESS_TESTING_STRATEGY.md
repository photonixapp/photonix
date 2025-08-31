# Alternative Testing Environments

This document outlines the testing strategies for the Photonix project. While Docker is the primary, recommended environment for ensuring consistency, this guide provides a documented alternative for setting up a "dockerless" environment when necessary.

## Strategy 1: Docker-Based Environment (Primary)

This is the recommended approach for all development and testing, as it guarantees a consistent environment for all contributors.

*   **Benefit**: Eliminates "it works on my machine" problems.
*   **Workflow**: Use the `docker-compose.dev.yml` file and `make` commands as described in the `README.md`.
*   **Disk Space Management**: To manage disk space, it is crucial to run `docker system prune -a --volumes -f` regularly to clean up unused images, containers, and build caches.

## Strategy 2: Dockerless Environment (Alternative)

This strategy should be used when Docker is not feasible. It requires manual installation and configuration of all services and dependencies.

**Warning**: This approach is more fragile than using Docker. Mismatched versions of services (like PostgreSQL or Redis) or system libraries can lead to hard-to-debug errors.

### Step 1: Install System Services

You must install and run a PostgreSQL server and a Redis server. On Debian-based systems (like Ubuntu), you can use:
```bash
sudo apt-get update
sudo apt-get install postgresql redis-server
```
Ensure they are running and accessible. You may need to create a database and user for Photonix.

### Step 2: Install System Dependencies

The application requires several system libraries to function correctly. This list is derived from the project's Dockerfile.
```bash
sudo apt-get install -y \
    cron \
    dcraw \
    file \
    libatlas3-base \
    libfreetype6 \
    libfreetype6-dev \
    libgl1 \
    libglib2.0-dev \
    libhdf5-dev \
    libheif-examples \
    libimage-exiftool-perl \
    libpq-dev \
    libtiff5-dev \
    netcat \
    nginx-light \
    supervisor \
    xz-utils
```

### Step 3: Set Up Backend Environment (Python)

1.  **Install Python**: Ensure you have Python 3.8 installed.
2.  **Create Virtual Environment**:
    ```bash
    python3 -m venv venv
    source venv/bin/activate
    ```
3.  **Install Dependencies**:
    ```bash
    pip install -r requirements.txt
    ```
4.  **Run Backend Tests**:
    ```bash
    # You will need to set environment variables for the database connection
    export DATABASE_URL=postgres://user:password@localhost/photonix
    export REDIS_URL=redis://localhost:6379/0
    pytest
    ```

### Step 4: Set Up Frontend Environment (NodeJS)

1.  **Install NodeJS and Yarn**: Follow standard procedures to install NodeJS (v14 is used in the Dockerfile) and Yarn.
2.  **Install Dependencies**:
    ```bash
    cd ui/
    yarn install
    ```
3.  **Run Frontend Tests**:
    ```bash
    yarn test
    ```

This dockerless setup allows for running unit and integration tests locally, but it requires careful manual setup. The Docker-based approach remains the recommended path for its consistency and reliability.
