FROM tensorflow/tensorflow:1.4.1-py3

RUN apt-get update && \
    apt-get install -y \
        libpq-dev=9.5.13-0ubuntu0.16.04 supervisor=3.2.0-2ubuntu0.2 \
        gunicorn=19.4.5-1ubuntu1 nginx-light=1.10.3-0ubuntu0.16.04.2 \
        libtiff5-dev=4.0.6-1ubuntu0.4 libjpeg-dev=8c-2ubuntu8 \
        libgdal-dev=1.11.3+dfsg-3build2 \
        libimage-exiftool-perl=10.10-1 netcat=1.10-41 && \
        apt-get clean && \
            rm -rf /var/lib/apt/lists/* \
                   /tmp/* \
                   /var/tmp/*

# Install Node
RUN curl -sL https://deb.nodesource.com/setup_6.x | bash - && apt-get update && apt-get install -y nodejs

# Install Python dependencies
COPY frontend-web/requirements.txt /srv/frontend-web/requirements.txt
RUN pip3 install -vU setuptools pip
RUN pip3 install -r /srv/frontend-web/requirements.txt

# Install NPM dependencies
COPY ui/package.json /srv/ui/package.json
WORKDIR /srv/ui
RUN npm install && npm install --only=dev

COPY frontend-web /srv/frontend-web
COPY ui/public /srv/ui/public
COPY ui/src /srv/ui/src
COPY ui/static /srv/ui/static

COPY run.sh /srv/run.sh
COPY supervisord.conf /etc/supervisord.conf
COPY nginx.conf /etc/nginx/nginx.conf

WORKDIR /srv
CMD ./run.sh

EXPOSE 80
