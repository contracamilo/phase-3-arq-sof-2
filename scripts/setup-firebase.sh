#!/bin/bash

# Firebase Setup Script
# This script helps you configure Firebase for the Notification Service

set -e

echo "🔥 Firebase Configuration Setup"
echo "================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if firebase-service-account.json exists
if [ -f "notification-service/firebase-service-account.json" ]; then
    echo -e "${GREEN}✅ Firebase service account file found!${NC}"
    echo ""
else
    echo -e "${YELLOW}⚠️  Firebase service account file not found${NC}"
    echo ""
    echo "Please follow these steps:"
    echo ""
    echo "1. Go to Firebase Console: https://console.firebase.google.com/"
    echo "2. Select your project (or create a new one)"
    echo "3. Go to Project Settings (⚙️) → Service Accounts"
    echo "4. Click 'Generate new private key'"
    echo "5. Save the downloaded JSON file as:"
    echo "   ${YELLOW}notification-service/firebase-service-account.json${NC}"
    echo ""
    read -p "Press Enter when you've downloaded the file..."
    echo ""
fi

# Validate JSON file
if [ -f "notification-service/firebase-service-account.json" ]; then
    # Check if it's valid JSON
    if jq empty notification-service/firebase-service-account.json 2>/dev/null; then
        echo -e "${GREEN}✅ JSON file is valid${NC}"
        
        # Extract project ID
        PROJECT_ID=$(jq -r '.project_id' notification-service/firebase-service-account.json)
        CLIENT_EMAIL=$(jq -r '.client_email' notification-service/firebase-service-account.json)
        
        echo ""
        echo "Firebase Project Configuration:"
        echo "  Project ID: ${GREEN}${PROJECT_ID}${NC}"
        echo "  Service Account: ${GREEN}${CLIENT_EMAIL}${NC}"
        echo ""
    else
        echo -e "${RED}❌ Invalid JSON file${NC}"
        echo "Please download a valid service account JSON file."
        exit 1
    fi
else
    echo -e "${RED}❌ File still not found${NC}"
    exit 1
fi

# Update .env file
if [ ! -f ".env" ]; then
    echo "Creating .env file from .env.example..."
    cp .env.example .env
    echo -e "${GREEN}✅ .env file created${NC}"
else
    echo -e "${GREEN}✅ .env file already exists${NC}"
fi

# Update GOOGLE_APPLICATION_CREDENTIALS in .env
if grep -q "^GOOGLE_APPLICATION_CREDENTIALS=" .env; then
    # Uncomment or update the line
    sed -i.bak 's|^# *GOOGLE_APPLICATION_CREDENTIALS=.*|GOOGLE_APPLICATION_CREDENTIALS=./notification-service/firebase-service-account.json|' .env
    sed -i.bak 's|^GOOGLE_APPLICATION_CREDENTIALS=.*|GOOGLE_APPLICATION_CREDENTIALS=./notification-service/firebase-service-account.json|' .env
    rm .env.bak
    echo -e "${GREEN}✅ Updated GOOGLE_APPLICATION_CREDENTIALS in .env${NC}"
else
    echo "GOOGLE_APPLICATION_CREDENTIALS=./notification-service/firebase-service-account.json" >> .env
    echo -e "${GREEN}✅ Added GOOGLE_APPLICATION_CREDENTIALS to .env${NC}"
fi

echo ""
echo "================================"
echo -e "${GREEN}🎉 Firebase configuration complete!${NC}"
echo ""
echo "Next steps:"
echo ""
echo "1. Install dependencies:"
echo "   ${YELLOW}npm install${NC}"
echo "   ${YELLOW}cd notification-service && npm install${NC}"
echo ""
echo "2. Start the infrastructure:"
echo "   ${YELLOW}docker-compose up -d postgres rabbitmq${NC}"
echo ""
echo "3. Initialize database:"
echo "   ${YELLOW}npm run db:migrate${NC}"
echo ""
echo "4. Start services:"
echo "   ${YELLOW}npm run dev${NC}"
echo "   ${YELLOW}cd notification-service && npm run dev${NC}"
echo ""
echo "5. Test Firebase (get a device token from your mobile app first):"
echo "   ${YELLOW}cd notification-service && npx ts-node test-fcm.ts${NC}"
echo ""
echo "📚 For more details, see: FIREBASE_SETUP.md"
echo ""
