#!/bin/bash

REQUIRED_NODE_VERSION=22.0.0
REQUIRED_YARN_VERSION=1.22.22
REQUIRED_DOCKER_VERSION=24.0.0

version_at_least() {
  [ "$(printf '%s\n' "$@" | sort -V | head -n 1)" == "$1" ]
}

# Check Node.js version
check_node_version() {
  if ! command -v node &> /dev/null; then
    echo "Node.js is not installed. Please install Node.js v$REQUIRED_NODE_VERSION or higher."
    exit 1
  fi

  NODE_VERSION=$(node -v | sed 's/v//')
  if ! version_at_least "$NODE_VERSION" "$REQUIRED_NODE_VERSION"; then
    echo "Current Node.js version ($NODE_VERSION) is incompatible. Please install v$REQUIRED_NODE_VERSION or higher."
    exit 1
  fi
}

# Check Yarn version
check_yarn_version() {
  if ! command -v yarn &> /dev/null; then
    echo "Yarn is not installed. Please install Yarn v$REQUIRED_YARN_VERSION or higher."
    exit 1
  fi

  YARN_VERSION=$(yarn -v)
  if ! version_at_least "$YARN_VERSION" "$REQUIRED_YARN_VERSION"; then
    echo "Current Yarn version ($YARN_VERSION) is incompatible. Please install v$REQUIRED_YARN_VERSION or higher."
    exit 1
  fi
}

# Check Docker version
check_docker_version() {
  if ! command -v docker &> /dev/null; then
    echo "Docker is not installed. Please install Docker v$REQUIRED_DOCKER_VERSION or higher."
    exit 1
  fi

  DOCKER_VERSION=$(docker --version | awk '{print $3}' | sed 's/,//')
  if ! version_at_least "$DOCKER_VERSION" "$REQUIRED_DOCKER_VERSION"; then
    echo "Current Docker version ($DOCKER_VERSION) is incompatible. Please install v$REQUIRED_DOCKER_VERSION or higher."
    exit 1
  fi
}

check_node_version
check_yarn_version
check_docker_version

echo "Node.js, Yarn and Docker versions are compatible. Proceeding..."

[ ! -f .env ] && cp env.example .env

# Create .env file if it doesn't exist
check_internet_connection() {
  curl -s https://www.google.com > /dev/null 2>&1
  if [[ $? -ne 0 ]]; then
    echo "No internet connection. Cannot fetch latest commits."
    return 1
  fi
  return 0
}

if ! check_internet_connection; then
  BEHIND_COMMITS_COUNT=0
else
  git fetch origin
  BEHIND_COMMITS_COUNT=$(git rev-list --count main..origin/main)
fi

GIT_COMMIT_HASH=$(git rev-parse main)
GIT_COMMIT_DATE=$(git show -s --format=%cI $MERGE_COMMIT_SHA)

update_or_add_env_var() {
  local var_name=$1
  local var_value=$2
  if grep -q "^$var_name=" .env; then
    if [[ "$OSTYPE" == "darwin"* ]]; then
      sed -i '' "s/^$var_name=.*/$var_name=$var_value/" .env
    else
      sed -i "s/^$var_name=.*/$var_name=$var_value/" .env
    fi
  else
    echo "$var_name=$var_value" >> .env
  fi
}

update_or_add_env_var "BUILD_DATE" "$GIT_COMMIT_DATE"
update_or_add_env_var "MERGE_COMMIT_SHA" "$GIT_COMMIT_HASH"
update_or_add_env_var "BEHIND_COMMITS_COUNT" "$BEHIND_COMMITS_COUNT"

set -o allexport; source .env; set +o allexport
cd ./cli || exit

{ yarn && yarn build; } > /dev/null 2>&1
yarn start

cd ..
