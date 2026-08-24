#!/bin/bash

echo 'MHQ_EXTRACT_BACKEND_DEPENDENCIES'
if [ -f /opt/venv.tar.gz ]; then
    mkdir -p /opt/venv
    tar xzf /opt/venv.tar.gz -C /opt/venv --strip-components=2
    rm -rf /opt/venv.tar.gz
else
    echo "Tar file /opt/venv.tar.gz does not exist. Skipping extraction."
fi

echo 'MHQ_EXTRACT_FRONTEND'
if [ -f /app/web-server.tar.gz ]; then
    mkdir -p /app/web-server
    tar xzf /app/web-server.tar.gz -C /app/web-server --strip-components=2
    rm -rf /app/web-server.tar.gz
else
    echo "Tar file /app/web-server.tar.gz does not exist. Skipping extraction."
fi

echo 'MHQ_STARTING SUPERVISOR'

if [ -f "/app/backend/analytics_server/mhq/config/config.ini" ]; then
  echo "config.ini found. Setting environment variables from config.ini..."
    while IFS='=' read -r key value; do
        if [[ "$key" =~ ^[A-Za-z_][A-Za-z0-9_]*$ && ! -z "$value" ]]; then
            # `export` matters, not just style: a plain `KEY=value` line only
            # becomes a local shell variable. It reaches supervisord's child
            # processes (frontend/backend) ONLY if the same variable was
            # already exported earlier in this shell -- true by accident in
            # dev (generate_config_ini.sh's build-time step writes `export
            # KEY=value` once, and bash's export attribute survives a later
            # plain reassignment of the same name), but never true on a
            # production boot that reaches this branch, since nothing else
            # exports these first.
            echo "export $key=$value" >> ~/.bashrc
        fi
    done < "/app/backend/analytics_server/mhq/config/config.ini"
else
    echo "config.ini not found. Running generate_config_ini.sh..."
    /app/setup_utils/generate_config_ini.sh -t /app/backend/analytics_server/mhq/config
fi

source ~/.bashrc

/usr/bin/supervisord -c "/etc/supervisord.conf"
