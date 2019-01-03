FROM python:3.6.8-slim-stretch

RUN apt-get update && \
    apt-get install -y \
        curl=7.52.1-5+deb9u8 \
        gnupg=2.1.18-8~deb9u3 \
        gunicorn=19.6.0-10+deb9u1 \
        libgdal-dev=2.1.2+dfsg-5 \
        libimage-exiftool-perl=10.40-1 \
        libjpeg-dev=1:1.5.1-2 \
        libpq-dev=9.6.10-0+deb9u1 \
        libtiff5-dev=4.0.8-2+deb9u4 \
        netcat=1.10-41 \
        nginx-light=1.10.3-1+deb9u2 \
        supervisor=3.3.1-1+deb9u1 \
        && \
        apt-get clean && \
            rm -rf /var/lib/apt/lists/* \
                   /tmp/* \
                   /var/tmp/*

# Install Node & Yarn
RUN curl -sL https://deb.nodesource.com/setup_11.x | bash - && \
    curl -sS https://dl.yarnpkg.com/debian/pubkey.gpg | apt-key add - && \
    echo "deb https://dl.yarnpkg.com/debian/ stable main" | tee /etc/apt/sources.list.d/yarn.list && \
    apt-get update && \
    apt-get install -y nodejs yarn && \
         apt-get clean && \
            rm -rf /var/lib/apt/lists/* \
                   /tmp/* \
                   /var/tmp/*

# Install NPM dependencies
COPY ui/package.json /srv/ui/package.json
COPY ui/yarn.lock /srv/ui/yarn.lock
COPY ui/config /srv/ui/config
COPY ui/scripts /srv/ui/scripts
WORKDIR /srv/ui
RUN yarn install

# Install Python dependencies
ENV PIPENV_TIMEOUT 600
WORKDIR /srv
COPY Pipfile /srv/Pipfile
RUN pip3 install pipenv
RUN pipenv run pip install pip==18.0
RUN pipenv install

# Copy over the code
COPY backend /srv/backend
COPY ui/public /srv/ui/public
COPY ui/src /srv/ui/src

# Copy system config and init scripts
COPY system /srv/system
COPY system/supervisord.conf /etc/supervisord.conf

# Build frontend app
RUN cd ui && yarn build

CMD ./system/run.sh

EXPOSE 80
