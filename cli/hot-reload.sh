#!/bin/bash

export NODE_ENV=development
export SKIP_CONTAINER_REBUILD=true
export TS_NODE_TRANSPILE_ONLY=true

PKG_MGR=$(command -v yarn >/dev/null && echo "yarn" || echo "npm")

if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  $PKG_MGR install
fi

mkdir -p .cache

echo "Starting CLI with optimized hot reloading..."
$PKG_MGR run dev:hot
