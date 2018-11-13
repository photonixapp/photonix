FROM python:3.6.5-slim-stretch

RUN apt-get update && \
    apt-get install -y \
        curl=7.52.1-5+deb9u6 \
        gnupg=2.1.18-8~deb9u2 \
        gunicorn=19.6.0-10+deb9u1 \
        libgdal-dev=2.1.2+dfsg-5 \
        libimage-exiftool-perl=10.40-1 \
        libjpeg-dev=1:1.5.1-2 \
        libpq-dev=9.6.7-0+deb9u1 \
        libtiff5-dev=4.0.8-2+deb9u2 \
        netcat=1.10-41 \
        nginx-light=1.10.3-1+deb9u1 \
        supervisor=3.3.1-1+deb9u1 \
        && \
        apt-get clean && \
            rm -rf /var/lib/apt/lists/* \
                   /tmp/* \
                   /var/tmp/*

# Install Node
RUN curl -sL https://deb.nodesource.com/setup_6.x | bash - && apt-get update && apt-get install -y nodejs

# Install NPM dependencies
COPY ui/package.json /srv/ui/package.json
WORKDIR /srv/ui
RUN npm install && npm install --only=dev

# Install Python dependencies
WORKDIR /srv
COPY Pipfile /srv/Pipfile
RUN pip3 install pipenv
RUN pipenv run pip install pip==18.0
RUN pipenv install

COPY backend /srv/backend
COPY ui/public /srv/ui/public
COPY ui/src /srv/ui/src
COPY ui/static /srv/ui/static

COPY run.sh /srv/run.sh
COPY supervisord.conf /etc/supervisord.conf
COPY nginx.conf /etc/nginx/nginx.conf

CMD ./run.sh

EXPOSE 80
