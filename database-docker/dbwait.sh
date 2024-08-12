#!/usr/bin/env bash

set -e
set -u
set -x

until dbmate wait
    do
        echo "inside dbmate"
        sleep 2
    done
