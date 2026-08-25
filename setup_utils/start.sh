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

CONFIG_DIR="/app/backend/analytics_server/mhq/config"
CONFIG_FILE="$CONFIG_DIR/config.ini"

# Provider tokens are encrypted with this key pair.  It must be stored in the
# persistent dev_keys volume: replacing it makes existing Jira tokens impossible
# to decrypt.  The backend reads this file directly, so copying it into .bashrc
# neither helps Jira nor is safe for private-key material.
if [ ! -f "$CONFIG_FILE" ]; then
    echo "config.ini not found. Generating keys for a new installation..."
    /app/setup_utils/generate_config_ini.sh -t "$CONFIG_DIR"
fi

# Do not silently generate a replacement when a mounted key file is corrupt:
# that would leave the database containing credentials encrypted with old keys.
if ! grep -qE '^[[:space:]]*SECRET_PRIVATE_KEY[[:space:]]*=[[:space:]]*[^[:space:]]+' "$CONFIG_FILE" || \
   ! grep -qE '^[[:space:]]*SECRET_PUBLIC_KEY[[:space:]]*=[[:space:]]*[^[:space:]]+' "$CONFIG_FILE"; then
    echo "Invalid $CONFIG_FILE: both RSA key entries are required. Refusing to start."
    exit 1
fi

/usr/bin/supervisord -c "/etc/supervisord.conf"
