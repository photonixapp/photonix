FROM debian:jessie

RUN apt-get update && \
    apt-get install -y curl python3-dev=3.4.2-2 python3-pip=1.5.6-5 \
        libpq-dev=9.4.10-0+deb8u1 supervisor=3.0r1-1 gunicorn=19.0-1 \
        nginx-light=1.6.2-5+deb8u4 curl=7.38.0-4+deb8u5 \
        libtiff5-dev=4.0.3-12.3+deb8u2 libjpeg-dev=1:1.3.1-12 \
        zlib1g-dev=1:1.2.8.dfsg-2+b1 libgdal-dev=1.10.1+dfsg-8+b3 \
        libimage-exiftool-perl=9.74-1 netcat=1.10-41 && \
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
