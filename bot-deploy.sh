#!/bin/bash

echo "1. Building sources"
npm run build
cp package.json build

echo "2. Reading config"
if [ -f ".env" ]; then
    export $(grep -v '^#' .env | xargs)
fi

echo "3. A new version sending"
yc serverless function version create \
    --function-name fiit-tools-bot \
    --entrypoint bot.cloudHandler \
    --runtime nodejs18 \
    --execution-timeout 120s \
    --memory 512MB \
    --environment TELEGRAM_TOKEN=${TELEGRAM_TOKEN},TELEGRAM_URL=${TELEGRAM_URL},NOTION_TOKEN=${NOTION_TOKEN},NOTION_RESOURCES_DB=${NOTION_RESOURCES_DB} \
    --source-path build

echo "4. Registering at Telegram"
npm run bot-register

echo "Finish!"
