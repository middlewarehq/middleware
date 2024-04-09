#!/usr/bin/env bash

set -e
set -u
set -x

POSTGRES_USER="${POSTGRES_USER:-postgres}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-postgres}"
POSTGRES_DB="${POSTGRES_DB:-dora-oss}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_HOST="${POSTGRES_HOST:-127.0.0.1}"



su - postgres -c "psql -U postgres -c 'CREATE DATABASE \"$POSTGRES_DB\";'"
su - postgres -c "psql -U postgres -d \"$POSTGRES_DB\" -c 'GRANT ALL PRIVILEGES ON DATABASE \"$POSTGRES_DB\" TO \"$POSTGRES_USER\";'"
su - postgres -c "psql -U postgres -c 'ALTER USER \"$POSTGRES_USER\" WITH ENCRYPTED PASSWORD '\''$POSTGRES_PASSWORD'\'';'"

# Construct the database URL
DB_URL="postgresql://$POSTGRES_USER:$POSTGRES_PASSWORD@$POSTGRES_HOST:$POSTGRES_PORT/$POSTGRES_DB?sslmode=disable"

/usr/local/bin/dbmate -u "$DB_URL" up

