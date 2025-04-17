#!/bin/bash

echo "1. Building sources"
npm run web-build
cp package.json build

echo "2. Reading config"
if [ -f ".env" ]; then
    export $(grep -v '^#' .env | xargs)
fi

echo "3. A new version sending"
if ! [ "${EDU_TOOLS_WEB_BUCKET}" ]; then
    echo "EDU_TOOLS_WEB_BUCKET is not set!"
    exit 1
fi

cd ./build
s3cmd sync . s3://${EDU_TOOLS_WEB_BUCKET}
s3cmd --recursive modify --acl-public --add-header='content-type':'text/javascript' --exclude '' --include '.js' s3://${EDU_TOOLS_WEB_BUCKET}
s3cmd --recursive modify --acl-public --add-header='content-type':'text/css' --exclude '' --include '.css' s3://${EDU_TOOLS_WEB_BUCKET}
cd ..

echo "Finish!"
