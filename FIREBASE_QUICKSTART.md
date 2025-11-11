# 🔥 Firebase Configuration - Quick Reference

## ✅ Configuration Status: COMPLETE

Your Firebase Cloud Messaging is properly configured and tested!

---

## 📁 Files Configured

| File | Purpose | Status |
|------|---------|--------|
| `soa-arch-soft-firebase-adminsdk-fbsvc-27fca782f6.json` | Service account credentials | ✅ Present |
| `.env` | Main service environment variables | ✅ Configured |
| `notification-service/.env` | Notification service config | ✅ Configured |
| `docker-compose.yml` | Firebase credentials mounted | ✅ Updated |
| `.gitignore` | Credentials protected from Git | ✅ Protected |
| `test-firebase.js` | Configuration test script | ✅ Passing |

---

## 🚀 Quick Start

### 1. Test Firebase Connection (Already Done! ✅)

```bash
node test-firebase.js
```

**Result:** ✅ Firebase initialized successfully!

### 2. Start Services with Docker Compose

```bash
# Start all infrastructure
docker-compose up -d postgres rabbitmq

# Wait for services to be healthy
docker-compose ps

# Start the application services
docker-compose up -d reminders-service notification-service

# View logs
docker-compose logs -f notification-service
```

### 3. Or Run Locally

```bash
# Terminal 1 - Main Service
npm install
npm run dev

# Terminal 2 - Notification Service
cd notification-service
npm install
npm run dev
```

---

## 📱 Getting Device Tokens

To receive notifications, you need device tokens from your mobile/web app.

### Web App (Browser)

```html
<!-- index.html -->
<script type="module">
  import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
  import { getMessaging, getToken } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging.js';

  const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "soa-arch-soft.firebaseapp.com",
    projectId: "soa-arch-soft",
    // ... other config
  };

  const app = initializeApp(firebaseConfig);
  const messaging = getMessaging(app);

  // Request permission and get token
  Notification.requestPermission().then((permission) => {
    if (permission === 'granted') {
      getToken(messaging, { vapidKey: 'YOUR_VAPID_KEY' })
        .then((token) => {
          console.log('FCM Token:', token);
          // Send this token to your backend
          fetch('/api/users/device-token', {
            method: 'POST',
            body: JSON.stringify({ token }),
            headers: { 'Content-Type': 'application/json' }
          });
        });
    }
  });
</script>
```

### Android App

```kotlin
// MainActivity.kt
FirebaseMessaging.getInstance().token.addOnCompleteListener { task ->
    if (task.isSuccessful) {
        val token = task.result
        Log.d("FCM", "Token: $token")
        // Send to your backend
    }
}
```

### iOS App

```swift
// AppDelegate.swift
import Firebase
import UserNotifications

func application(_ application: UIApplication, 
                 didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
    Messaging.messaging().apnsToken = deviceToken
    
    Messaging.messaging().token { token, error in
        if let token = token {
            print("FCM Token: \(token)")
            // Send to your backend
        }
    }
}
```

---

## 🧪 Testing End-to-End Flow

### 1. Create a Test Reminder

```bash
curl -X POST http://localhost:3000/v1/reminders \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $(uuidgen)" \
  -d '{
    "userId": "test-user-123",
    "title": "Test Notification",
    "message": "Testing FCM integration",
    "dueAt": "2025-11-11T20:30:00Z",
    "advanceMinutes": 15,
    "source": "manual"
  }'
```

### 2. Verify in RabbitMQ

Open http://localhost:15672 (guest/guest)
- Check "Queues" tab
- Look for `reminders.queue`
- You should see messages

### 3. Check Notification Service Logs

```bash
docker-compose logs -f notification-service
```

Expected output:
```
[INFO] RabbitMQ consumer started, waiting for messages...
[INFO] Processing reminder_due event: <reminder-id>
[INFO] Looking up device tokens for user: test-user-123
[INFO] Sending FCM notification...
[INFO] ✅ Notification sent successfully
```

### 4. Add Device Token to Database

First, you need to store device tokens. Add this to your database:

```sql
-- Create device_tokens table
CREATE TABLE IF NOT EXISTS device_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id VARCHAR(255) NOT NULL,
  token TEXT NOT NULL,
  platform VARCHAR(20) NOT NULL, -- 'android', 'ios', 'web'
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, token)
);

-- Insert test token
INSERT INTO device_tokens (user_id, token, platform) 
VALUES ('test-user-123', 'YOUR_DEVICE_TOKEN_HERE', 'web');
```

---

## 🔍 Monitoring & Debugging

### Check Firebase Console

1. Go to https://console.firebase.google.com/project/soa-arch-soft
2. Click "Cloud Messaging" in left menu
3. View delivery reports

### Common Issues

**Issue:** "Requested entity was not found"
- **Solution:** Device token is invalid or expired. Get a fresh token.

**Issue:** "Sender ID mismatch"
- **Solution:** Make sure your client app uses the same Firebase project.

**Issue:** "Permission denied"
- **Solution:** Check that Firebase service account has `Firebase Admin SDK` role.

### Debug Mode

Enable verbose logging in notification service:

```bash
# In notification-service/.env
LOG_LEVEL=debug
```

---

## 📊 Environment Variables Reference

### Main Service (.env)
```bash
GOOGLE_APPLICATION_CREDENTIALS=./soa-arch-soft-firebase-adminsdk-fbsvc-27fca782f6.json
FIREBASE_PROJECT_ID=soa-arch-soft
```

### Notification Service (notification-service/.env)
```bash
GOOGLE_APPLICATION_CREDENTIALS=../soa-arch-soft-firebase-adminsdk-fbsvc-27fca782f6.json
FIREBASE_PROJECT_ID=soa-arch-soft
RABBITMQ_URL=amqp://guest:guest@localhost:5672
```

### Docker Compose
```yaml
notification-service:
  environment:
    GOOGLE_APPLICATION_CREDENTIALS: /app/firebase-credentials.json
    FIREBASE_PROJECT_ID: soa-arch-soft
  volumes:
    - ./soa-arch-soft-firebase-adminsdk-fbsvc-27fca782f6.json:/app/firebase-credentials.json:ro
```

---

## 🔐 Security Checklist

- [x] Firebase credentials file present
- [x] Credentials added to `.gitignore`
- [x] Environment variables configured
- [x] Docker volume mounted as read-only (`:ro`)
- [ ] File permissions restricted: `chmod 600 *.json`
- [ ] Never commit credentials to Git
- [ ] Rotate keys regularly (every 90 days)
- [ ] Use different credentials for dev/staging/production

---

## 📚 Additional Resources

- [Firebase Admin SDK Documentation](https://firebase.google.com/docs/admin/setup)
- [FCM Server Reference](https://firebase.google.com/docs/cloud-messaging/server)
- [Firebase Console](https://console.firebase.google.com/project/soa-arch-soft)

---

## ✅ What's Working

✅ Firebase Admin SDK initialized  
✅ Service account authenticated  
✅ Cloud Messaging service available  
✅ Environment variables configured  
✅ Docker Compose integration complete  
✅ Credentials secured in `.gitignore`  

## 🎯 Next Steps

1. **Get device tokens** from your mobile/web app
2. **Store tokens** in database (`device_tokens` table)
3. **Create a reminder** via API
4. **Verify notification** is received on device
5. **Monitor logs** in Jaeger and Prometheus

---

**Configuration completed on:** November 11, 2025  
**Project:** soa-arch-soft  
**Status:** ✅ Ready for Testing
