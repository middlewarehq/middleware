#!/bin/bash

#!/bin/bash

MINIMUM_NODE_VERSION=22.0.0
MINIMUM_YARN_VERSION=1.22.22
MINIMUM_DOCKER_VERSION=24.0.0

# Function to compare versions correctly
version_at_least() {
  printf '%s\n%s\n' "$1" "$2" | sort -V | head -n 1 | grep -qx "$1"
}

check_versions() {
  local node_version yarn_version docker_version
  local errors=()

  # Check Node.js version
  if ! command -v node &> /dev/null; then
    errors+=("Node.js is not installed. Please install Node.js v$MINIMUM_NODE_VERSION or higher.")
  else
    node_version=$(node -v | sed 's/^v//')
    if ! version_at_least "$MINIMUM_NODE_VERSION" "$node_version"; then
      errors+=("Current Node.js version ($node_version) is incompatible. Please install v$MINIMUM_NODE_VERSION or higher.")
    fi
  fi

  # Check Yarn version
  if ! command -v yarn &> /dev/null; then
    errors+=("Yarn is not installed. Please install Yarn v$MINIMUM_YARN_VERSION or higher.")
  else
    yarn_version=$(yarn -v)
    if ! version_at_least "$MINIMUM_YARN_VERSION" "$yarn_version"; then
      errors+=("Current Yarn version ($yarn_version) is incompatible. Please install v$MINIMUM_YARN_VERSION or higher.")
    fi
  fi

  # Check Docker version
  if ! command -v docker &> /dev/null; then
    errors+=("Docker is not installed. Please install Docker v$MINIMUM_DOCKER_VERSION or higher.")
  else
    docker_version=$(docker --version | awk '{print $3}' | sed 's/,//')
    if ! version_at_least "$MINIMUM_DOCKER_VERSION" "$docker_version"; then
      errors+=("Current Docker version ($docker_version) is incompatible. Please install v$MINIMUM_DOCKER_VERSION or higher.")
    fi
  fi

  # Display errors, if any
  if [ ${#errors[@]} -ne 0 ]; then
    for error in "${errors[@]}"; do
      echo "$error"
    done
    exit 1
  fi

  echo "All required versions are met."
}

check_versions


[ ! -f .env ] && cp env.example .env

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
