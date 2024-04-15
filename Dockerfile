# Build the backend
FROM python:3.9-slim as backend-build

# Prevents Python from writing pyc files.
ENV PYTHONDONTWRITEBYTECODE=1

ARG ENVIRONMENT=dev

WORKDIR /app/backend
COPY ./apiserver /app/backend/apiserver
RUN apt-get update && apt-get install -y --no-install-recommends \
  git \
  libpq-dev \
  gcc \
  build-essential \
  && cd ./apiserver \
  && python3 -m venv /opt/venv \
  && /opt/venv/bin/pip install --upgrade pip \
  && if [ "$ENVIRONMENT" = "dev" ]; then \
  /opt/venv/bin/pip install -r dev-requirements.txt; \
  fi \
  && /opt/venv/bin/pip install -r requirements.txt

# Build the frontend
FROM node:16-alpine as frontend-build
WORKDIR /app/frontend/
COPY ./web-server /app/frontend/web-server
RUN apk add --no-cache yarn && \
    cd web-server && \
   if [ "$ENVIRONMENT" = "dev" ]; then \
    yarn install && yarn cache clean \
  else \
    yarn install && \
    yarn build && \
    yarn cache clean && \
    tar -xvf  ./artifacts/artifact.tar.gz --directory=./artifacts && \
    find ./ -mindepth 1 -maxdepth 1 ! -name 'artifacts' -exec rm -rf {} + \
    mv ./artifacts/* ./* && rm -rf ./artifacts; \
  fi

# Final image
FROM python:3.9-slim

WORKDIR /app
COPY --from=backend-build /opt/venv /opt/venv
COPY --from=backend-build /app/backend /app/backend
COPY --from=frontend-build /app/frontend/web-server/ /app/frontend/web-server

COPY ./database-docker/db/ /app/db/
COPY ./init_db.sh /app/
COPY ./generate_config_ini.sh /app/
COPY ./cronjob.txt /etc/cron.d/cronjob
COPY ./supervisord.conf /etc/supervisord.conf

RUN chmod +x /app/init_db.sh \
  && apt-get update && apt-get install -y --no-install-recommends \
  libpq-dev \
  cron \
  postgresql \
  postgresql-contrib \
  redis-server \
  supervisor \
  curl \
  && curl -fsSL https://deb.nodesource.com/setup_16.x | bash - \
  && apt-get install -y nodejs \
  && npm install --global yarn \
  && curl -fsSL -o /usr/local/bin/dbmate https://github.com/amacneil/dbmate/releases/download/v1.16.0/dbmate-linux-amd64 \
  && chmod +x /usr/local/bin/dbmate \
  && echo "host all  all    0.0.0.0/0  md5" >> /etc/postgresql/15/main/pg_hba.conf \
  && echo "listen_addresses='*'" >> /etc/postgresql/15/main/postgresql.conf \
  && cd /app/frontend/web-server \
  && yarn install \
  && mkdir -p /var/log/postgres \
  && touch /var/log/postgres/postgres.log \
  && mkdir -p /var/log/init_db \
  && touch /var/log/init_db/init_db.log \
  && mkdir -p /var/log/redis \
  && touch /var/log/redis/redis.log \
  && mkdir -p /var/log/apiserver \
  && touch /var/log/apiserver/apiserver.log \
  && mkdir -p /var/log/webserver \
  && touch /var/log/webserver/webserver.log \
  && mkdir -p /var/log/cron \
  && touch /var/log/cron/cron.log \
  && chmod 0644 /etc/cron.d/cronjob \
  && crontab /etc/cron.d/cronjob \
  && yarn cache clean \
  && apt-get clean \
  && rm -rf /var/lib/apt/lists/* \
  && /app/generate_config_ini.sh -t /app/backend/apiserver/dora/config

ARG POSTGRES_DB_ENABLED=true
ARG DB_INIT_ENABLED=true
ARG REDIS_ENABLED=true
ARG BACKEND_ENABLED=true
ARG FRONTEND_ENABLED=true
ARG CRON_ENABLED=true

ENV POSTGRES_DB_ENABLED=$POSTGRES_DB_ENABLED
ENV DB_INIT_ENABLED=$DB_INIT_ENABLED
ENV REDIS_ENABLED=$REDIS_ENABLED
ENV BACKEND_ENABLED=$BACKEND_ENABLED
ENV FRONTEND_ENABLED=$FRONTEND_ENABLED
ENV CRON_ENABLED=$CRON_ENABLED
ENV PATH="/opt/venv/bin:/usr/lib/postgresql/15/bin:$PATH"

EXPOSE 5432 6379 9696 3000

CMD ["/usr/bin/supervisord", "-c", "/etc/supervisord.conf"]
