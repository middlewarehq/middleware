#!/bin/bash

cd ./cli
{yarn && yarn build} > /dev/null 2>&1
yarn start

