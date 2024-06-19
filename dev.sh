#!/bin/bash

docker compose down

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
