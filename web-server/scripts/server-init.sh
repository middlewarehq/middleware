#! /bin/bash
set -e

DIR=$(dirname $0)

source $DIR/utils.sh
is_project_root

install_yarn_cmd_if_not_exists pm2
# install_if_missing_vector

set +e
pm2 delete MHQ_HTTP_SERVER
set -e

NEXT_MANUAL_SIG_HANDLE=true
pm2 start "yarn http" --name MHQ_HTTP_SERVER