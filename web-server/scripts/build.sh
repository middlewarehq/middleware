#! /bin/bash
set -e

DIR=$(dirname $0)

source $DIR/utils.sh
catch_force_exit
is_project_root

NEXT_MANUAL_SIG_HANDLE=true
yarn run next build
yarn run build:workers

echo "EXITED $?"

rm -rf .next/cache
yarn run zip
