# 🔥 Firebase Configuration Guide

This guide walks you through setting up Firebase Cloud Messaging (FCM) for the Notification Service.

---

## 📋 Prerequisites

- Google account
- Access to [Firebase Console](https://console.firebase.google.com/)
- Node.js project with `firebase-admin` installed

---

## 🚀 Step-by-Step Setup

### 1. Create Firebase Project

1. Visit [Firebase Console](https://console.firebase.google.com/)
2. Click **"Add project"** (or use existing project)
3. Enter project name: `reminders-notification-service`
4. (Optional) Enable Google Analytics
5. Click **"Create project"**

### 2. Enable Cloud Messaging

1. In your Firebase project dashboard
2. Click on **Project Settings** (⚙️ gear icon)
3. Navigate to **"Cloud Messaging"** tab
4. Note your **Server Key** and **Sender ID** (for reference)

### 3. Generate Service Account Credentials

#### Option A: Download Service Account JSON

1. Go to **Project Settings** → **"Service accounts"** tab
2. Click **"Generate new private key"**
3. Confirm by clicking **"Generate key"**
4. Save the downloaded JSON file

**Important:** Keep this file secure! It contains sensitive credentials.

#### Option B: Use Individual Environment Variables

Extract values from the JSON file:

```json
{
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "abc123...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com",
  "client_id": "123456789",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/..."
}
```

---

## 📁 File Placement

### Option 1: Service Account JSON File (Recommended for Development)

```bash
# Place the file in the notification-service directory
cp ~/Downloads/firebase-service-account.json ./notification-service/firebase-service-account.json

# Add to .gitignore to prevent committing credentials
echo "notification-service/firebase-service-account.json" >> .gitignore
```

### Option 2: Environment Variables (Recommended for Production)

Add to your `.env` file:

```env
# Firebase Configuration
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com

# Or use the JSON file path
GOOGLE_APPLICATION_CREDENTIALS=./notification-service/firebase-service-account.json
```

---

## 🔧 Configuration in Code

The notification service is already configured to use Firebase. Here's how it works:

### Using JSON File

```typescript
// notification-service/consumer.ts (already implemented)
import admin from 'firebase-admin';
import serviceAccount from './firebase-service-account.json';

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount as admin.ServiceAccount)
});
```

### Using Environment Variables

```typescript
// Alternative configuration
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  })
});
```

---

## 📱 Register Device Tokens

To send notifications, you need device FCM tokens from your mobile apps.

### Android App (Java/Kotlin)

```kotlin
// In your Android app
import com.google.firebase.messaging.FirebaseMessaging

FirebaseMessaging.getInstance().token.addOnCompleteListener { task ->
    if (task.isSuccessful) {
        val token = task.result
        // Send token to your backend
        registerDeviceToken(userId, token)
    }
}
```

### iOS App (Swift)

```swift
// In your iOS app
import FirebaseMessaging

Messaging.messaging().token { token, error in
    if let token = token {
        // Send token to your backend
        registerDeviceToken(userId: userId, token: token)
    }
}
```

### Web App (JavaScript)

```javascript
// In your web app
import { getMessaging, getToken } from "firebase/messaging";

const messaging = getMessaging();
getToken(messaging, { vapidKey: 'YOUR_VAPID_KEY' }).then((token) => {
  // Send token to your backend
  registerDeviceToken(userId, token);
});
```

---

## 🗄️ Store Device Tokens

You need to store FCM tokens in your database to send notifications.

### Database Schema

```sql
-- Add to init.sql
CREATE TABLE device_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id VARCHAR(255) NOT NULL,
  token TEXT NOT NULL UNIQUE,
  platform VARCHAR(20) NOT NULL, -- 'android', 'ios', 'web'
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_used_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_device_tokens_user_id ON device_tokens(user_id);
CREATE INDEX idx_device_tokens_token ON device_tokens(token);
```

### API Endpoint to Register Tokens

```typescript
// Add to src/routes/device.routes.ts
import { Router } from 'express';
import { pool } from '../config/database';

const router = Router();

router.post('/devices/register', async (req, res) => {
  const { userId, token, platform } = req.body;
  
  await pool.query(
    `INSERT INTO device_tokens (user_id, token, platform)
     VALUES ($1, $2, $3)
     ON CONFLICT (token) 
     DO UPDATE SET user_id = $1, platform = $3, updated_at = NOW()`,
    [userId, token, platform]
  );
  
  res.status(201).json({ message: 'Device registered' });
});

export default router;
```

---

## 🧪 Test Firebase Configuration

### 1. Quick Test Script

Create `notification-service/test-fcm.ts`:

```typescript
import admin from 'firebase-admin';
import serviceAccount from './firebase-service-account.json';

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount as admin.ServiceAccount)
});

async function testFCM() {
  const message = {
    notification: {
      title: 'Test Notification',
      body: 'Firebase is working!',
    },
    token: 'YOUR_DEVICE_TOKEN_HERE', // Replace with actual device token
  };

  try {
    const response = await admin.messaging().send(message);
    console.log('✅ Successfully sent message:', response);
  } catch (error) {
    console.error('❌ Error sending message:', error);
  }
}

testFCM();
```

Run the test:

```bash
cd notification-service
npx ts-node test-fcm.ts
```

### 2. Test with cURL

```bash
# Get a device token first from your mobile app
DEVICE_TOKEN="your-device-fcm-token"
USER_ID="test-user"

# Register device token
curl -X POST http://localhost:3000/devices/register \
  -H "Content-Type: application/json" \
  -d "{
    \"userId\": \"$USER_ID\",
    \"token\": \"$DEVICE_TOKEN\",
    \"platform\": \"android\"
  }"

# Create a reminder (will trigger notification when due)
curl -X POST http://localhost:3000/v1/reminders \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $(uuidgen)" \
  -d "{
    \"userId\": \"$USER_ID\",
    \"title\": \"Test notification\",
    \"dueAt\": \"2025-11-10T16:00:00Z\",
    \"advanceMinutes\": 5
  }"
```

---

## 🔒 Security Best Practices

### 1. Never Commit Credentials

```bash
# Add to .gitignore
echo "firebase-service-account.json" >> .gitignore
echo "notification-service/firebase-service-account.json" >> .gitignore
echo ".env" >> .gitignore
```

### 2. Use Secret Management in Production

**AWS Secrets Manager:**
```bash
aws secretsmanager create-secret \
  --name firebase-credentials \
  --secret-string file://firebase-service-account.json
```

**Google Cloud Secret Manager:**
```bash
gcloud secrets create firebase-credentials \
  --data-file=firebase-service-account.json
```

**Kubernetes Secrets:**
```bash
kubectl create secret generic firebase-credentials \
  --from-file=firebase-service-account.json
```

### 3. Restrict Service Account Permissions

In Firebase Console:
1. Go to **IAM & Admin**
2. Find your service account
3. Ensure it only has necessary roles:
   - `Firebase Cloud Messaging Admin`
   - Remove unnecessary permissions

---

## 🐳 Docker Configuration

### Update docker-compose.yml

```yaml
notification-service:
  build: ./notification-service
  environment:
    - RABBITMQ_URL=amqp://guest:guest@rabbitmq:5672
    - GOOGLE_APPLICATION_CREDENTIALS=/app/firebase-service-account.json
  volumes:
    - ./notification-service/firebase-service-account.json:/app/firebase-service-account.json:ro
  depends_on:
    - rabbitmq
```

### Build and Run

```bash
docker-compose up -d notification-service
docker-compose logs -f notification-service
```

---

## 🔍 Troubleshooting

### Error: "Error fetching access token"

**Cause:** Invalid service account credentials

**Solution:**
1. Regenerate service account key in Firebase Console
2. Verify the JSON file is valid
3. Check file permissions: `chmod 600 firebase-service-account.json`

### Error: "Invalid registration token"

**Cause:** Device token is invalid or expired

**Solution:**
1. Obtain a fresh token from the mobile app
2. Implement token refresh logic in your app
3. Remove invalid tokens from database

### Error: "Requested entity was not found"

**Cause:** Project ID mismatch

**Solution:**
1. Verify `project_id` in service account JSON
2. Ensure Firebase project is active
3. Check that FCM API is enabled in Google Cloud Console

### No Notifications Received

**Checklist:**
- [ ] FCM service account is valid
- [ ] Device token is correctly registered in database
- [ ] Notification service is running (`docker-compose logs notification-service`)
- [ ] RabbitMQ messages are being published (`rabbitmqadmin list queues`)
- [ ] Mobile app has notification permissions enabled
- [ ] Check notification-service logs for errors

---

## 📊 Monitoring FCM

### View Sent Messages

```bash
# Check notification service logs
docker-compose logs -f notification-service | grep "FCM notification sent"
```

### Firebase Console Metrics

1. Go to Firebase Console → **Cloud Messaging**
2. View dashboard showing:
   - Messages sent
   - Delivery rate
   - Error rate
   - Device distribution

### Custom Metrics (Already Implemented)

```typescript
// In notification-service/consumer.ts
// Metrics are exposed via OpenTelemetry:
// - fcm_notifications_sent_total
// - fcm_notifications_failed_total
// - fcm_notification_duration_ms
```

Query in Prometheus:
```promql
# Success rate
rate(fcm_notifications_sent_total[5m])

# Error rate
rate(fcm_notifications_failed_total[5m])

# Latency
histogram_quantile(0.95, fcm_notification_duration_ms)
```

---

## 🎯 Next Steps

1. **Download service account JSON** from Firebase Console
2. **Place file** in `notification-service/firebase-service-account.json`
3. **Update `.env`** with Firebase configuration
4. **Test configuration** with test script
5. **Register device tokens** from mobile apps
6. **Verify notifications** are delivered

---

## 📚 Additional Resources

- [Firebase Admin SDK Setup](https://firebase.google.com/docs/admin/setup)
- [FCM Server Reference](https://firebase.google.com/docs/cloud-messaging/server)
- [FCM Architecture](https://firebase.google.com/docs/cloud-messaging/fcm-architecture)
- [Handle FCM Messages in Android](https://firebase.google.com/docs/cloud-messaging/android/receive)
- [Handle FCM Messages in iOS](https://firebase.google.com/docs/cloud-messaging/ios/receive)

---

**Questions?** Check the [Firebase Console](https://console.firebase.google.com/) or notification-service logs.
