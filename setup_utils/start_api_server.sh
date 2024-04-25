#!/bin/bash

set -u

TOPIC="db_init"
SUB_DIR="/tmp/pubsub"

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

cd /app/backend/analytics_server

cd /app/backend/analytics_server
if [ "$ENVIRONMENT" == "prod" ]; then
  /opt/venv/bin/gunicorn -w 4 -b 0.0.0.0:9696 --timeout 0 app:app
else
  /opt/venv/bin/gunicorn -w 4 -b 0.0.0.0:9696 --timeout 0 --reload app:app
fi