#! /bin/sh
set -e

DIR=$(dirname $0)

source $DIR/utils.sh
is_project_root

COMMON_ENV=$(cat ./.local_envs/.env.common 2> /dev/null)
LOCAL_ENV=$(cat ./.local_envs/.env.local 2> /dev/null)
STAGE_ENV=$(cat ./.local_envs/.env.staging 2> /dev/null)

if [ "$1" == "prod" ]; then
  echo "# PRODUCTION ENV CONFIG. USE WITH CAUTION" > .env.local;
else
  echo "# STAGING ENV CONFIG" > .env.local;
fi

echo "$COMMON_ENV" >> .env.local;

if [ "$1" == "prod" ]; then
  PROD_ENV=$(cat ./.local_envs/.env.production 2> /dev/null)
  echo "$PROD_ENV" >> .env.local;
else
  echo "$STAGE_ENV" >> .env.local;
fi

echo -e "\n\n# LOCAL CONFIG" >> .env.local;
echo "$LOCAL_ENV" >> .env.local;

echo "🎉 .env.local updated"
