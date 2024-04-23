ARG ENVIRONMENT=prod
ARG POSTGRES_DB_ENABLED=true
ARG DB_INIT_ENABLED=true
ARG REDIS_ENABLED=true
ARG BACKEND_ENABLED=true
ARG FRONTEND_ENABLED=true
ARG CRON_ENABLED=true

# Build the backend
FROM python:3.9.19-alpine3.19 as backend-build

# Prevents Python from writing pyc files.
ENV PYTHONDONTWRITEBYTECODE=1

WORKDIR /app/
COPY ./backend /app/backend
RUN apk update && \
    apk add --no-cache \
        git \
        postgresql-dev \
        gcc \
        musl-dev \
        python3-dev \
    && cd ./backend/analytics_server/ \
    && python3 -m venv /opt/venv \
    && /opt/venv/bin/pip install --upgrade pip \
    && /opt/venv/bin/pip install -r requirements.txt

FROM node:16.20.2-alpine3.18 as node

# Final image
FROM postgres:alpine3.19

WORKDIR /app
COPY --from=backend-build /opt/venv /opt/venv
COPY --from=backend-build /usr/local/bin/ /usr/local/bin/
COPY --from=backend-build /usr/local/lib/ /usr/local/lib/
COPY --from=backend-build /usr/local/include /usr/local/include

COPY --from=node /usr/lib /usr/lib
COPY --from=node /usr/local/lib /usr/local/lib
COPY --from=node /usr/local/include /usr/local/include
COPY --from=node /usr/local/bin /usr/local/bin

COPY . /app/

RUN apk add --no-cache \
        gcc \
        build-base \
        libpq \
        postgresql-dev \
        postgresql-client \
        postgresql-contrib \
        redis \
        supervisor \
        curl \
    && mkdir -p /etc/cron.d && mv /app/setup_utils/cronjob.txt /etc/cron.d/cronjob \
    && chmod +x /app/setup_utils/start.sh /app/setup_utils/init_db.sh /app/setup_utils/generate_config_ini.sh \
    && mv ./setup_utils/supervisord.conf /etc/supervisord.conf \
    && mv /app/database-docker/db/ /app/ && rm -rf /app/database-docker/ \
    && su - postgres -c "initdb -D /var/lib/postgresql/data" \
    && su - postgres -c "echo \"host all  all    0.0.0.0/0  md5\" >> /var/lib/postgresql/data/pg_hba.conf" \
    && su - postgres -c "echo \"listen_addresses='*'\" >> /var/lib/postgresql/data/postgresql.conf" \
    && su - postgres -c "rm -f /var/lib/postgresql/data/postmaster.pid" \
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
    && mkdir -p /var/log/webserver \
    && touch /var/log/webserver/webserver.log \
    && mkdir -p /var/log/cron \
    && touch /var/log/cron/cron.log \
    && chmod 0644 /etc/cron.d/cronjob \
    && crontab /etc/cron.d/cronjob \
    && /app/setup_utils/generate_config_ini.sh -t /app/apiserver/dora/config \
    && cd /app/web-server \
    && yarn && yarn build \
    && rm -rf ./artifacts \
    && cd /app/ \
    && tar cfz web-server.tar.gz ./web-server \
    && rm -rf ./web-server && mkdir -p /app/web-server \
    && tar cfz /opt/venv.tar.gz /opt/venv/ \
    && rm -rf /opt/venv && mkdir -p /opt/venv \
    && yarn cache clean \
    && rm -rf /var/cache/apk/*

ENV POSTGRES_DB_ENABLED=$POSTGRES_DB_ENABLED
ENV DB_INIT_ENABLED=$DB_INIT_ENABLED
ENV REDIS_ENABLED=$REDIS_ENABLED
ENV BACKEND_ENABLED=$BACKEND_ENABLED
ENV FRONTEND_ENABLED=$FRONTEND_ENABLED
ENV CRON_ENABLED=$CRON_ENABLED
ENV DB_HOST=localhost
ENV DB_NAME=dora-oss
ENV DB_PASS=postgres
ENV DB_PORT=5432
ENV DB_USER=postgres
ENV REDIS_HOST=localhost
ENV REDIS_PORT=6379
ENV PORT=3000
ENV NEXT_PUBLIC_APP_ENVIRONMENT="staging"
ENV INTERNAL_API_BASE_URL=http://localhost:9696
ENV NEXT_PUBLIC_APP_ENVIRONMENT="prod"
ENV PATH="/opt/venv/bin:$PATH"

EXPOSE 5432 6379 9696 3000

CMD ["/bin/sh", "-c", "/app/setup_utils/start.sh"]
