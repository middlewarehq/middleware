#! /bin/bash
set -e

DIR=$(dirname $0)

source $DIR/utils.sh
is_project_root

echo "Starting artifact creation"

rm -rf artifacts
mkdir artifacts
tar -czf \
  artifacts/artifact.tar.gz \
  package.json \
  yarn.lock \
  http-server.js \
  .next \
  next.config.js \
  public \
  scripts \

  
echo "Completed artifact creation"
