#!/bin/bash
# CLUSTOX: cron does not inherit the container environment, so source it before
# calling the sync server, which now requires the internal token.
set -a
[ -f /app/.env ] && . /app/.env
set +a

curl -s -X POST \
  -H "X-Internal-Token: ${INTERNAL_API_TOKEN}" \
  "http://localhost:${SYNC_SERVER_PORT:-9697}/sync"
