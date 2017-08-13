FROM debian:stretch

RUN apt-get update && \
    apt-get install -y curl python3-dev=3.5.3-1 python3-pip=9.0.1-2 \
        libpq-dev=9.6.4-0+deb9u1 supervisor=3.3.1-1 gunicorn=19.6.0-10 \
        nginx-light=1.10.3-1+deb9u1 curl=7.52.1-5 \
        libtiff5-dev=4.0.8-2+deb9u1 libjpeg-dev=1:1.5.1-2 \
        zlib1g-dev=1:1.2.8.dfsg-5 libgdal-dev=2.1.2+dfsg-5 \
        libimage-exiftool-perl=10.40-1 netcat=1.10-41 && \
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
