ARG ENVIRONMENT=prod
ARG POSTGRES_DB_ENABLED=true
ARG DB_INIT_ENABLED=true
ARG REDIS_ENABLED=true
ARG BACKEND_ENABLED=true
ARG FRONTEND_ENABLED=true
ARG CRON_ENABLED=true
ARG BUILD_DATE
ARG MERGE_COMMIT_SHA


# Build the backend
FROM python:3.9-slim as backend-build

# Prevents Python from writing pyc files.
ENV PYTHONDONTWRITEBYTECODE=1

WORKDIR /app/
COPY ./backend /app/backend
RUN apt-get update && apt-get install -y --no-install-recommends \
        gcc \
        libpq-dev \
        build-essential \
    && cd ./backend/ \
    && python3 -m venv /opt/venv \
    && /opt/venv/bin/pip install --upgrade pip \
    && /opt/venv/bin/pip install -r requirements.txt

# Final image
FROM python:3.9-slim

ARG BUILD_DATE
ARG MERGE_COMMIT_SHA

ENV ENVIRONMENT=prod
ENV DB_HOST=localhost
ENV DB_NAME=mhq-oss
ENV DB_PASS=postgres
ENV DB_PORT=5434
ENV DB_USER=postgres
ENV REDIS_HOST=localhost
ENV REDIS_PORT=6385
ENV PORT=3333
ENV ANALYTICS_SERVER_PORT=9696
ENV SYNC_SERVER_PORT=9697
ENV INTERNAL_API_BASE_URL=http://localhost:9696
ENV INTERNAL_SYNC_API_BASE_URL=http://localhost:9697
ENV NEXT_PUBLIC_APP_ENVIRONMENT="prod"
ENV BUILD_DATE=$BUILD_DATE
ENV MERGE_COMMIT_SHA=$MERGE_COMMIT_SHA

WORKDIR /app
COPY --from=backend-build /opt/venv /opt/venv

COPY . /app/

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        gcc \
        build-essential \
        libpq-dev \
        cron \
        postgresql \
        postgresql-contrib \
        redis-server \
        supervisor \
        curl \
    && curl -fsSL https://deb.nodesource.com/setup_16.x | bash - \
    && apt-get install -y nodejs \
    && mkdir -p /etc/cron.d && mv /app/setup_utils/cronjob.txt /etc/cron.d/cronjob \
    && chmod +x /app/setup_utils/* \
    && mv /app/setup_utils/supervisord.conf /etc/supervisord.conf \
    && mv /app/database-docker/db/ /app/ && rm -rf /app/database-docker/ \
    && echo "host all  all    0.0.0.0/0  md5" >> /etc/postgresql/15/main/pg_hba.conf \
    && echo "listen_addresses='*'" >> /etc/postgresql/15/main/postgresql.conf \
    && sed -i "s/^port = .*/port = ${DB_PORT}/" /etc/postgresql/15/main/postgresql.conf \
    && npm install --global yarn --force \
    && curl -fsSL -o /usr/local/bin/dbmate https://github.com/amacneil/dbmate/releases/download/v1.16.0/dbmate-linux-amd64 \
    && chmod +x /usr/local/bin/dbmate \
    && mkdir -p /var/log/postgres \
    && touch /var/log/postgres/postgres.log \
    && mkdir -p /var/log/init_db \
    && touch /var/log/init_db/init_db.log \
    && mkdir -p /var/log/redis \
    && touch /var/log/redis/redis.log \
    && mkdir -p /var/log/apiserver \
    && touch /var/log/apiserver/apiserver.log \
    && mkdir -p /var/log/sync_server \
    && touch /var/log/sync_server/sync_server.log \
    && mkdir -p /var/log/web-server \
    && touch /var/log/web-server/web-server.log \
    && mkdir -p /var/log/cron \
    && touch /var/log/cron/cron.log \
    && chmod 0644 /etc/cron.d/cronjob \
    && crontab /etc/cron.d/cronjob \
    && cd /app/web-server \
    && yarn install --network-timeout 1000000 && yarn build \
    && rm -rf ./artifacts \
    && cd /app/ \
    && tar cfz web-server.tar.gz ./web-server \
    && rm -rf ./web-server && mkdir -p /app/web-server \
    && tar cfz /opt/venv.tar.gz /opt/venv/ \
    && rm -rf /opt/venv && mkdir -p /opt/venv \
    && yarn cache clean \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

ENV POSTGRES_DB_ENABLED=true
ENV DB_INIT_ENABLED=true
ENV REDIS_ENABLED=true
ENV BACKEND_ENABLED=true
ENV FRONTEND_ENABLED=true
ENV CRON_ENABLED=true
ENV BUILD_DATE=$BUILD_DATE
ENV MERGE_COMMIT_SHA=$MERGE_COMMIT_SHA

ENV PATH="/opt/venv/bin:/usr/lib/postgresql/15/bin:/usr/local/bin:$PATH"

EXPOSE 3333 

CMD ["/bin/bash", "-c", "/app/setup_utils/start.sh"]
