#!/bin/bash

TOPIC="db_init"
SUB_DIR="/tmp/pubsub"

# Function to wait for message on a topic
wait_for_message() {
    while [ ! -f "$SUB_DIR/$TOPIC" ]; do
        sleep 1
    done
    MESSAGE=$(cat "$SUB_DIR/$TOPIC")
    echo "Received message: $MESSAGE"
}

# Wait for message on the specified topic
wait_for_message

cd /app/backend/analytics_server

# Start Procrastinate worker
PYTHONPATH=. PROCRASTINATE_APP=procrastinate_worker.app procrastinate worker
