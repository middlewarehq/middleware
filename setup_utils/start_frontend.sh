#!/bin/bash

set -u

cd /app/web-server/

if [ "$ENVIRONMENT" == "prod" ]; then
  yarn http
else
  yarn dev
fi

