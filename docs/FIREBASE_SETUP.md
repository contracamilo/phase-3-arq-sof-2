# 🔥 Guía de Configuración Firebase

Esta guía te acompaña en la configuración de Firebase Cloud Messaging (FCM) para el Servicio de Notificaciones.

---

## 📋 Prerrequisitos

- Cuenta de Google
- Acceso a [Consola Firebase](https://console.firebase.google.com/)
- Proyecto Node.js con `firebase-admin` instalado

---

## 🚀 Configuración Paso a Paso

### 1. Crear Proyecto Firebase

1. Visitar [Consola Firebase](https://console.firebase.google.com/)
2. Hacer clic en **"Agregar proyecto"** (o usar proyecto existente)
3. Ingresar nombre del proyecto: `reminders-notification-service`
4. (Opcional) Habilitar Google Analytics
5. Hacer clic en **"Crear proyecto"**

### 2. Habilitar Cloud Messaging

1. En el panel de tu proyecto Firebase
2. Hacer clic en **Configuración del proyecto** (icono de ⚙️)
3. Navegar a la pestaña **"Cloud Messaging"**
4. Anotar tu **Clave del servidor** y **ID del remitente** (para referencia)

### 3. Generar Credenciales de Cuenta de Servicio

#### Opción A: Descargar JSON de Cuenta de Servicio

1. Ir a **Configuración del proyecto** → pestaña **"Cuentas de servicio"**
2. Hacer clic en **"Generar nueva clave privada"**
3. Confirmar haciendo clic en **"Generar clave"**
4. Guardar el archivo JSON descargado

**Importante:** ¡Mantén este archivo seguro! Contiene credenciales sensibles.

#### Opción B: Usar Variables de Entorno Individuales

Extraer valores del archivo JSON:

```json
{
  "type": "service_account",
  "project_id": "tu-project-id",
  "private_key_id": "abc123...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-xxxxx@tu-project.iam.gserviceaccount.com",
  "client_id": "123456789",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/..."
}
```

---

## 📁 Ubicación de Archivos

### Opción 1: Archivo JSON de Cuenta de Servicio (Recomendado para Desarrollo)

```bash
# Colocar el archivo en el directorio notification-service
cp ~/Downloads/firebase-service-account.json ./notification-service/firebase-service-account.json

# Agregar a .gitignore para evitar confirmar credenciales
echo "notification-service/firebase-service-account.json" >> .gitignore
```

### Opción 2: Variables de Entorno (Recomendado para Producción)

Agregar a tu archivo `.env`:

```env
# Configuración Firebase
FIREBASE_PROJECT_ID=tu-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nTU_CLAVE_PRIVADA_AQUI\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@tu-project.iam.gserviceaccount.com

# O usar la ruta del archivo JSON
GOOGLE_APPLICATION_CREDENTIALS=./notification-service/firebase-service-account.json
```

---

## 🔧 Configuración en Código

El servicio de notificaciones ya está configurado para usar Firebase. Aquí cómo funciona:

### Usando Archivo JSON

```typescript
// notification-service/consumer.ts (ya implementado)
import admin from 'firebase-admin';
import serviceAccount from './firebase-service-account.json';

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount as admin.ServiceAccount)
});
```

### Usando Variables de Entorno

```typescript
// Configuración alternativa
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  })
});
```

---

## 📱 Registrar Tokens de Dispositivo

Para enviar notificaciones, necesitas tokens FCM de tus aplicaciones móviles.

### Aplicación Android (Java/Kotlin)

```kotlin
// En tu aplicación Android
import com.google.firebase.messaging.FirebaseMessaging

FirebaseMessaging.getInstance().token.addOnCompleteListener { task ->
    if (task.isSuccessful) {
        val token = task.result
        // Enviar token a tu backend
        registerDeviceToken(userId, token)
    }
}
```

### Aplicación iOS (Swift)

```swift
// En tu aplicación iOS
import FirebaseMessaging

Messaging.messaging().token { token, error in
    if let token = token {
        // Enviar token a tu backend
        registerDeviceToken(userId: userId, token: token)
    }
}
```

### Aplicación Web (JavaScript)

```javascript
// En tu aplicación web
import { getMessaging, getToken } from "firebase/messaging";

const messaging = getMessaging();
getToken(messaging, { vapidKey: 'TU_CLAVE_VAPID' }).then((token) => {
  // Enviar token a tu backend
  registerDeviceToken(userId, token);
});
```

---

## 🗄️ Almacenar Tokens de Dispositivo

Necesitas almacenar tokens FCM en tu base de datos para enviar notificaciones.

### Esquema de Base de Datos

```sql
-- Agregar a init.sql
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

### Endpoint de API para Registrar Tokens

```typescript
// Agregar a src/routes/device.routes.ts
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

  res.status(201).json({ message: 'Dispositivo registrado' });
});

export default router;
```

---

## 🧪 Probar Configuración Firebase

### 1. Script de Prueba Rápida

Crear `notification-service/test-fcm.ts`:

```typescript
import admin from 'firebase-admin';
import serviceAccount from './firebase-service-account.json';

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount as admin.ServiceAccount)
});

async function testFCM() {
  const message = {
    notification: {
      title: 'Notificación de Prueba',
      body: '¡Firebase está funcionando!',
    },
    token: 'TU_TOKEN_DISPOSITIVO_AQUI', // Reemplazar con token real
  };

  try {
    const response = await admin.messaging().send(message);
    console.log('✅ Mensaje enviado exitosamente:', response);
  } catch (error) {
    console.error('❌ Error enviando mensaje:', error);
  }
}

testFCM();
```

Ejecutar la prueba:

```bash
cd notification-service
npx ts-node test-fcm.ts
```

### 2. Probar con cURL

```bash
# Obtener un token de dispositivo primero de tu aplicación móvil
DEVICE_TOKEN="tu-token-fcm-dispositivo"
USER_ID="usuario-prueba"

# Registrar token de dispositivo
curl -X POST http://localhost:3000/devices/register \
  -H "Content-Type: application/json" \
  -d "{
    \"userId\": \"$USER_ID\",
    \"token\": \"$DEVICE_TOKEN\",
    \"platform\": \"android\"
  }"

# Crear un recordatorio (activará notificación cuando llegue el momento)
curl -X POST http://localhost:3000/v1/reminders \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $(uuidgen)" \
  -d "{
    \"userId\": \"$USER_ID\",
    \"title\": \"Notificación de prueba\",
    \"dueAt\": \"2025-11-10T16:00:00Z\",
    \"advanceMinutes\": 5
  }"
```

---

## 🔒 Mejores Prácticas de Seguridad

### 1. Nunca Confirmar Credenciales

```bash
# Agregar a .gitignore
echo "firebase-service-account.json" >> .gitignore
echo "notification-service/firebase-service-account.json" >> .gitignore
echo ".env" >> .gitignore
```

### 2. Usar Gestión de Secretos en Producción

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

### 3. Restringir Permisos de Cuenta de Servicio

En Consola Firebase:
1. Ir a **IAM y administración**
2. Encontrar tu cuenta de servicio
3. Asegurarse de que solo tenga roles necesarios:
   - `Firebase Cloud Messaging Admin`
   - Remover permisos innecesarios

---

## 🐳 Configuración Docker

### Actualizar docker-compose.yml

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

### Construir y Ejecutar

```bash
docker-compose up -d notification-service
docker-compose logs -f notification-service
```

---

## 🔍 Solución de Problemas

### Error: "Error fetching access token"

**Causa:** Credenciales de cuenta de servicio inválidas

**Solución:**
1. Regenerar clave de cuenta de servicio en Consola Firebase
2. Verificar que el archivo JSON sea válido
3. Verificar permisos de archivo: `chmod 600 firebase-service-account.json`

### Error: "Invalid registration token"

**Causa:** Token de dispositivo inválido o expirado

**Solución:**
1. Obtener un token fresco de la aplicación móvil
2. Implementar lógica de actualización de token en tu app
3. Remover tokens inválidos de la base de datos

### Error: "Requested entity was not found"

**Causa:** ID de proyecto no coincide

**Solución:**
1. Verificar `project_id` en JSON de cuenta de servicio
2. Asegurarse de que el proyecto Firebase esté activo
3. Verificar que la API FCM esté habilitada en Google Cloud Console

### No se Reciben Notificaciones

**Lista de verificación:**
- [ ] Cuenta de servicio FCM es válida
- [ ] Token de dispositivo está registrado correctamente en base de datos
- [ ] Servicio de notificaciones está ejecutándose (`docker-compose logs notification-service`)
- [ ] Mensajes RabbitMQ están siendo publicados (`rabbitmqadmin list queues`)
- [ ] Aplicación móvil tiene permisos de notificación habilitados
- [ ] Verificar registros del servicio de notificaciones para errores

---

## 📊 Monitoreo FCM

### Ver Mensajes Enviados

```bash
# Verificar registros del servicio de notificaciones
docker-compose logs -f notification-service | grep "FCM notification sent"
```

### Métricas de Consola Firebase

1. Ir a Consola Firebase → **Cloud Messaging**
2. Ver panel mostrando:
   - Mensajes enviados
   - Tasa de entrega
   - Tasa de error
   - Distribución de dispositivos

### Métricas Personalizadas (Ya Implementadas)

```typescript
// En notification-service/consumer.ts
// Las métricas se exponen vía OpenTelemetry:
// - fcm_notifications_sent_total
// - fcm_notifications_failed_total
// - fcm_notification_duration_ms
```

Consultar en Prometheus:
```promql
# Tasa de éxito
rate(fcm_notifications_sent_total[5m])

# Tasa de error
rate(fcm_notifications_failed_total[5m])

# Latencia
histogram_quantile(0.95, fcm_notification_duration_ms)
```

---

## 🎯 Próximos Pasos

1. **Descargar JSON de cuenta de servicio** de Consola Firebase
2. **Colocar archivo** en `notification-service/firebase-service-account.json`
3. **Actualizar `.env`** con configuración Firebase
4. **Probar configuración** con script de prueba
5. **Registrar tokens de dispositivo** de aplicaciones móviles
6. **Verificar notificaciones** sean entregadas

---

## 📚 Recursos Adicionales

- [Configuración Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)
- [Referencia del Servidor FCM](https://firebase.google.com/docs/cloud-messaging/server)
- [Arquitectura FCM](https://firebase.google.com/docs/cloud-messaging/fcm-architecture)
- [Manejar Mensajes FCM en Android](https://firebase.google.com/docs/cloud-messaging/android/receive)
- [Manejar Mensajes FCM en iOS](https://firebase.google.com/docs/cloud-messaging/ios/receive)

---

**¿Preguntas?** Verifica la [Consola Firebase](https://console.firebase.google.com/) o los registros del servicio de notificaciones.
