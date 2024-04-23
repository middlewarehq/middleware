#!/bin/sh

set -e
set -u
set -x

POSTGRES_USER="${DB_USER:-postgres}"
POSTGRES_PASSWORD="${DB_PASS:-postgres}"
POSTGRES_DB="${DB_NAME:-dora-oss}"
POSTGRES_PORT="${DB_PORT:-5432}"
POSTGRES_HOST="${DB_HOST:-127.0.0.1}"

wait_for_postgres() {
    until su - postgres -c "psql -U postgres -c '\q'"; do
        echo "PostgreSQL is unavailable - sleeping"
        sleep 1
    done
    echo "PostgreSQL is up - continuing"
}

# Wait for PostgreSQL to become available
wait_for_postgres

# Check if the database already exists
if su - postgres -c "psql -U postgres -lqt | cut -d \| -f 1 | grep -qw $POSTGRES_DB"; then
    echo "Database $POSTGRES_DB already exists"
else
    # Create the database if it doesn't exist
    su - postgres -c "psql -U postgres -c 'CREATE DATABASE \"$POSTGRES_DB\";'"
    su - postgres -c "psql -U postgres -d \"$POSTGRES_DB\" -c 'GRANT ALL PRIVILEGES ON DATABASE \"$POSTGRES_DB\" TO \"$POSTGRES_USER\";'"
    su - postgres -c "psql -U postgres -c 'ALTER USER \"$POSTGRES_USER\" WITH ENCRYPTED PASSWORD '\''$POSTGRES_PASSWORD'\'';'"
fi

# Construct the database URL
DB_URL="postgresql://$POSTGRES_USER:$POSTGRES_PASSWORD@$POSTGRES_HOST:$POSTGRES_PORT/$POSTGRES_DB?sslmode=disable"

/usr/local/bin/dbmate -u "$DB_URL" up

exit 0
