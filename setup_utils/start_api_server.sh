#!/bin/bash

set -u

TOPIC="db_init"
SUB_DIR="/tmp/pubsub"
API_SERVER_PORT=$ANALYTICS_SERVER_PORT

# Function to wait for message on a topic
wait_for_message() {
    while [ ! -f "$SUB_DIR/$TOPIC" ]; do
        sleep 1
    done
    # Read message from topic file
    MESSAGE=$(cat "$SUB_DIR/$TOPIC")
    echo "Received message: $MESSAGE"
}

# Wait for message on the specified topic
wait_for_message

cd /app/backend/analytics_server || exit
if [ "$ENVIRONMENT" == "prod" ]; then
  /opt/venv/bin/gunicorn -w 4 -b 127.0.0.1:$API_SERVER_PORT --timeout 0 --access-logfile '-' --error-logfile '-' app:app
else
  /opt/venv/bin/gunicorn -w 4 -b 127.0.0.1:$API_SERVER_PORT --timeout 0 --access-logfile '-' --error-logfile '-' --reload app:app
fi
