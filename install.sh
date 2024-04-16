#! /bin/bash

function check_docker_daemon() {
    docker info >/dev/null 2>&1
    if [ $? -ne 0 ]; then
        echo "Docker daemon is not running. Please start Docker and try again."
        exit 1
    fi
}

# Function to show access info
function show_access_info() {
    echo "Please wait."
    echo "Access API server on http://localhost:9696"
    echo "Access Postgres DB on http://localhost:5436"
    echo "Access Redis on http://localhost:6380"
    echo -e "Access frontend on http://localhost:3005\n"
}

export ENVIRONMENT="prod"
check_docker_daemon
docker-compose up -d

show_access_info
