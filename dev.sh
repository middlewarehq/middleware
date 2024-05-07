#!/bin/bash

docker-compose down

cat env.example > .env

cd ./cli

{ yarn && yarn build; } > /dev/null 2>&1
yarn start

cd ..