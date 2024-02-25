echo "1. Building sources"
npm run build
cp package.json build

echo "2. A new version sending"
yc serverless function version create --function-name fiit-tools-bot --entrypoint bot.cloudHandler --runtime nodejs18 --execution-timeout 120s --source-path build

echo "3. Registering at Telegram"
npm run bot-register

echo "Success!"
