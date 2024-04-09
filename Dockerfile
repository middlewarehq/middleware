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

# Final image
FROM python:3.9-slim
# Prevents Python from writing pyc files.
ENV PYTHONDONTWRITEBYTECODE=1

WORKDIR /app
COPY --from=backend-build /opt/venv /opt/venv
COPY --from=backend-build /app/backend /app/backend
COPY ./database-docker/db/ /app/db/
COPY ./init_db.sh /app/
COPY ./supervisord.conf /etc/supervisord.conf

RUN chmod +x /app/init_db.sh \
    && apt-get update && apt-get install -y --no-install-recommends \
        libpq-dev \
        postgresql \
        postgresql-contrib \
        redis-server \
        supervisor \
        curl \
    && curl -fsSL -o /usr/local/bin/dbmate https://github.com/amacneil/dbmate/releases/download/v1.16.0/dbmate-linux-amd64 \
    && chmod +x /usr/local/bin/dbmate \
    && echo "host all  all    0.0.0.0/0  md5" >> /etc/postgresql/15/main/pg_hba.conf \
    && echo "listen_addresses='*'" >> /etc/postgresql/15/main/postgresql.conf 

ENV PATH="/opt/venv/bin:/usr/lib/postgresql/15/bin:$PATH"

EXPOSE 5432 6379 5000

CMD ["/usr/bin/supervisord", "-c", "/etc/supervisord.conf"]
