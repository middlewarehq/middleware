#! /bin/bash
set -e

function catch_force_exit() {
  # stty -echoctl
  trap force_exit INT

  force_exit() {
    echo "Force exiting..."
  }
}

function is_project_root() {
  if [ -f ./package.json ] && [ -f ./next.config.js ]; then
    return 0
  else
    echo "You must run this command from the project root.";
    exit 1
  fi
}

function install_yarn_cmd_if_not_exists() {
  if ! command -v $1; then
    yarn global add $1
    if ! command -v $1; then
      export PATH=$PATH:$(yarn global bin);
      if ! command -v $1; then echo "$1 command not found. exiting..."; fi
    fi
  else
    echo "$1 command exists"
  fi
}
