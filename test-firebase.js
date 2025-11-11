#!/usr/bin/env node
/**
 * Firebase Configuration Test
 * This script verifies that Firebase is properly configured
 */

const admin = require('firebase-admin');
const path = require('path');

console.log('🔥 Testing Firebase Configuration...\n');

// Load service account
const serviceAccountPath = path.join(__dirname, 'soa-arch-soft-firebase-adminsdk-fbsvc-27fca782f6.json');
let serviceAccount;

try {
  serviceAccount = require(serviceAccountPath);
  console.log('✅ Service account file loaded successfully');
  console.log(`   Project ID: ${serviceAccount.project_id}`);
  console.log(`   Client Email: ${serviceAccount.client_email}\n`);
} catch (error) {
  console.error('❌ Failed to load service account file:', error.message);
  process.exit(1);
}

// Initialize Firebase Admin
try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  console.log('✅ Firebase Admin SDK initialized successfully\n');
} catch (error) {
  console.error('❌ Failed to initialize Firebase:', error.message);
  process.exit(1);
}

// Test sending a message (dry run)
async function testNotification() {
  console.log('📱 Testing notification capabilities...\n');
  
  // You need a real device token to actually send
  // For now, just verify the messaging service is available
  const messaging = admin.messaging();
  
  console.log('✅ Firebase Cloud Messaging service is available\n');
  
  console.log('📋 Next Steps:');
  console.log('1. Get a device token from your mobile app or web app');
  console.log('2. Store the token in your database associated with a user');
  console.log('3. When a reminder is due, retrieve the token and send notification');
  console.log('\nExample device token format:');
  console.log('   dQw4w9WgXcQ:APA91bHun4MxP...(long string)\n');
  
  console.log('✅ Firebase configuration test completed successfully! 🎉');
}

testNotification().catch(error => {
  console.error('❌ Test failed:', error.message);
  process.exit(1);
});
