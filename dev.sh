#!/bin/bash

docker-compose down

cat env.example > .env

GIT_COMMIT_HASH=$(git rev-parse main)
GIT_COMMIT_DATE=$(git show -s --format=%cI $MERGE_COMMIT_SHA)

if [[ "$OSTYPE" == "darwin"* ]]; then
    sed -i '' "s/^BUILD_DATE=.*/BUILD_DATE=$GIT_COMMIT_DATE/" .env
    sed -i '' "s/^MERGE_COMMIT_SHA=.*/MERGE_COMMIT_SHA=$GIT_COMMIT_HASH/" .env
else
    sed -i "s/^BUILD_DATE=.*/BUILD_DATE=$GIT_COMMIT_DATE/" .env
    sed -i "s/^MERGE_COMMIT_SHA=.*/MERGE_COMMIT_SHA=$GIT_COMMIT_HASH/" .env
fi


cd ./cli || exit

{ yarn && yarn build; } > /dev/null 2>&1
yarn start

cd ..