ARG ARCH=
FROM ${ARCH}python:3.13-slim-trixie AS builder

# Build-time system dependencies - some are only used on non-amd64 where the
# Python packages have to be compiled from source. This mirrors the Python
# builder side of Dockerfile.prd; there is no Node/UI build here because the
# ML sidecar serves no web tier.
RUN apt-get update && \
    apt-get install -y \
        build-essential \
        cmake \
        curl \
        gfortran \
        gnupg \
        libopenblas-dev \
        libblas-dev \
        libblas3 \
        libfreetype6 \
        libfreetype6-dev \
        libjpeg-dev \
        liblapack-dev \
        liblapack3 \
        libpq-dev \
        libssl-dev \
        libtiff-dev \
    && \
        apt-get clean && \
            rm -rf /var/lib/apt/lists/* \
                   /tmp/* \
                   /var/tmp/*

# Install Python dependencies
WORKDIR /srv
COPY docker/pip.conf /etc/pip.conf
COPY docker/.pypirc /root/.pypirc
RUN pip install --upgrade pip
RUN pip install --no-cache-dir pypi-uploader==1.1.0

COPY requirements.txt /srv/requirements.txt
COPY docker/install_and_upload_python_packages.py /root/install_and_upload_python_packages.py
ENV PYTHONUNBUFFERED=1
RUN --mount=type=secret,id=PYPI_UPLOAD_USERNAME \
    --mount=type=secret,id=PYPI_UPLOAD_PASSWORD \
    PYPI_UPLOAD_USERNAME=$(cat /run/secrets/PYPI_UPLOAD_USERNAME 2>/dev/null || echo "") && \
    PYPI_UPLOAD_PASSWORD=$(cat /run/secrets/PYPI_UPLOAD_PASSWORD 2>/dev/null || echo "") && \
    if [ "${PYPI_UPLOAD_USERNAME}" = "" ] ; \
     then python /root/install_and_upload_python_packages.py ; \
     else python /root/install_and_upload_python_packages.py -u ${PYPI_UPLOAD_USERNAME} -p ${PYPI_UPLOAD_PASSWORD} ; \
    fi

# Remove large unused files in Python site-packages. Conservative compared with
# Dockerfile.prd (scipy/matplotlib/cv2-data are kept) so the classifiers keep
# all their runtime dependencies; only build tooling and the test stack go.
RUN find /usr/local/lib/python3.13 -type d -name  "__pycache__" -exec rm -r {} + && \
    find /usr/local/lib/python3.13/site-packages -type d -name  "tests" -exec rm -r {} +
RUN rm -rf \
    /usr/local/lib/python3.13/site-packages/pip \
    /usr/local/lib/python3.13/site-packages/setuptools \
    /usr/local/lib/python3.13/site-packages/pypi_uploader \
    /usr/local/lib/python3.13/site-packages/pytest \
    /usr/local/lib/python3.13/site-packages/_pytest \
    /usr/local/lib/python3.13/site-packages/pytest_django \
    /usr/local/lib/python3.13/site-packages/pluggy \
    /usr/local/lib/python3.13/site-packages/iniconfig \
    /usr/local/lib/python3.13/site-packages/mock \
    /usr/local/lib/python3.13/site-packages/factory \
    /usr/local/lib/python3.13/site-packages/faker \
    /usr/local/lib/python3.13/site-packages/coverage


FROM ${ARCH}python:3.13-slim-trixie

ARG UID=2000
ARG GID=2000

# Runtime system dependencies - same as Dockerfile.prd minus nginx-light
# (no web tier is served from this container).
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        dcraw \
        file \
        libopenblas0 \
        libfreetype6 \
        libgl1 \
        libglib2.0-0t64 \
        libheif-examples \
        libimage-exiftool-perl \
        libpq5 \
        libtiff6 \
        netcat-openbsd \
        supervisor \
        xz-utils \
    && \
        apt-get clean && \
            rm -rf /var/lib/apt/lists/* \
                   /tmp/* \
                   /var/tmp/*

# Copy over installed Python packages
COPY --from=builder /usr/local/lib/python3.13/site-packages /usr/local/lib/python3.13/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

WORKDIR /srv

# Copy over the code (no ui/ - this container renders nothing)
COPY photonix /srv/photonix
COPY manage.py /srv/manage.py
COPY test.py /srv/test.py

# Copy system config and init scripts
COPY system /srv/system

ENV PYTHONPATH=/srv

RUN groupadd -g $GID photonix && \
    useradd -u $UID -g $GID -s /bin/sh photonix && \
    chown -R photonix:photonix /srv /var/run /run /tmp
USER photonix

# Healthy once supervisord is up and reports its programs. supervisorctl exits
# non-zero if the socket is unreachable or any program is not RUNNING. The long
# start period covers waiting for the core container to apply migrations plus
# first-boot model loading.
HEALTHCHECK --interval=30s --timeout=10s --start-period=10m --retries=3 \
    CMD supervisorctl -c /srv/system/supervisord-ml.conf status || exit 1

CMD ["./system/run_ml.sh"]
