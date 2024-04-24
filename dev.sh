#!/bin/bash

cd ./cli
{ yarn install && yarn build; } > /dev/null 2>&1
yarn start

