# 🔥 Referencia Rápida de Configuración Firebase

## ✅ Estado de Configuración: COMPLETA

Tu Firebase Cloud Messaging está configurado y probado correctamente!

---

## 📁 Archivos Configurados

| Archivo | Propósito | Estado |
|---------|-----------|--------|
| `soa-arch-soft-firebase-adminsdk-fbsvc-27fca782f6.json` | Credenciales de cuenta de servicio | ✅ Presente |
| `.env` | Variables de entorno del servicio principal | ✅ Configurado |
| `notification-service/.env` | Configuración del servicio de notificaciones | ✅ Configurado |
| `docker-compose.yml` | Credenciales Firebase montadas | ✅ Actualizado |
| `.gitignore` | Credenciales protegidas de Git | ✅ Protegido |
| `test-firebase.js` | Script de prueba de configuración | ✅ Pasando |

---

## 🚀 Inicio Rápido

### 1. Probar Conexión Firebase (Ya Hecho! ✅)

```bash
node test-firebase.js
```

**Resultado:** ✅ Firebase inicializado exitosamente!

### 2. Iniciar Servicios con Docker Compose

```bash
# Iniciar toda la infraestructura
docker-compose up -d postgres rabbitmq

# Esperar que los servicios estén saludables
docker-compose ps

# Iniciar los servicios de aplicación
docker-compose up -d reminders-service notification-service

# Ver registros
docker-compose logs -f notification-service
```

### 3. O Ejecutar Localmente

```bash
# Terminal 1 - Servicio Principal
npm install
npm run dev

# Terminal 2 - Servicio de Notificaciones
cd notification-service
npm install
npm run dev
```

---

## 📱 Obtener Tokens de Dispositivo

Para recibir notificaciones, necesitas tokens de dispositivo de tu aplicación móvil/web.

### Aplicación Web (Navegador)

```html
<!-- index.html -->
<script type="module">
  import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
  import { getMessaging, getToken } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging.js';

  const firebaseConfig = {
    apiKey: "TU_API_KEY",
    authDomain: "soa-arch-soft.firebaseapp.com",
    projectId: "soa-arch-soft",
    // ... otras configuraciones
  };

  const app = initializeApp(firebaseConfig);
  const messaging = getMessaging(app);

  // Solicitar permiso y obtener token
  Notification.requestPermission().then((permission) => {
    if (permission === 'granted') {
      getToken(messaging, { vapidKey: 'TU_VAPID_KEY' })
        .then((token) => {
          console.log('Token FCM:', token);
          // Enviar este token a tu backend
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

### Aplicación Android

```kotlin
// MainActivity.kt
FirebaseMessaging.getInstance().token.addOnCompleteListener { task ->
    if (task.isSuccessful) {
        val token = task.result
        Log.d("FCM", "Token: $token")
        // Enviar a tu backend
    }
}
```

### Aplicación iOS

```swift
// AppDelegate.swift
import Firebase
import UserNotifications

func application(_ application: UIApplication, 
                 didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
    Messaging.messaging().apnsToken = deviceToken
    
    Messaging.messaging().token { token, error in
        if let token = token {
            print("Token FCM: \(token)")
            // Enviar a tu backend
        }
    }
}
```

---

## 🧪 Probar Flujo E2E

### 1. Crear un Recordatorio de Prueba

```bash
curl -X POST http://localhost:3000/v1/reminders \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $(uuidgen)" \
  -d '{
    "userId": "test-user-123",
    "title": "Notificación de Prueba",
    "message": "Probando integración FCM",
    "dueAt": "2025-11-11T20:30:00Z",
    "advanceMinutes": 15,
    "source": "manual"
  }'
```

### 2. Verificar en RabbitMQ

Abrir http://localhost:15672 (guest/guest)
- Hacer clic en pestaña "Queues"
- Buscar `reminders.queue`
- Deberías ver mensajes

### 3. Verificar Registros del Servicio de Notificaciones

```bash
docker-compose logs -f notification-service
```

Salida esperada:
```
[INFO] Consumidor RabbitMQ iniciado, esperando mensajes...
[INFO] Procesando evento reminder_due: <reminder-id>
[INFO] Buscando tokens de dispositivo para usuario: test-user-123
[INFO] Enviando notificación FCM...
[INFO] ✅ Notificación enviada exitosamente
```

### 4. Agregar Token de Dispositivo a la Base de Datos

Primero, necesitas almacenar tokens de dispositivo. Agrega esto a tu base de datos:

```sql
-- Crear tabla device_tokens
CREATE TABLE IF NOT EXISTS device_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id VARCHAR(255) NOT NULL,
  token TEXT NOT NULL,
  platform VARCHAR(20) NOT NULL, -- 'android', 'ios', 'web'
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, token)
);

-- Insertar token de prueba
INSERT INTO device_tokens (user_id, token, platform) 
VALUES ('test-user-123', 'TU_TOKEN_DISPOSITIVO_AQUI', 'web');
```

---

## 🔍 Monitoreo y Depuración

### Verificar Consola Firebase

1. Ir a https://console.firebase.google.com/project/soa-arch-soft
2. Hacer clic en "Cloud Messaging" en el menú izquierdo
3. Ver reportes de entrega

### Problemas Comunes

**Error:** "Entidad solicitada no encontrada"
- **Solución:** El token del dispositivo no es válido o ha expirado. Obtén un token fresco.

**Error:** "ID de remitente no coincide"
- **Solución:** Asegúrate de que tu aplicación cliente use el mismo proyecto Firebase.

**Error:** "Permiso denegado"
- **Solución:** Verifica que la cuenta de servicio Firebase tenga el rol `Firebase Admin SDK`.

### Modo Depuración

Habilitar logging detallado en el servicio de notificaciones:

```bash
# En notification-service/.env
LOG_LEVEL=debug
```

---

## 📊 Referencia de Variables de Entorno

### Servicio Principal (.env)
```bash
GOOGLE_APPLICATION_CREDENTIALS=./soa-arch-soft-firebase-adminsdk-fbsvc-27fca782f6.json
FIREBASE_PROJECT_ID=soa-arch-soft
```

### Servicio de Notificaciones (notification-service/.env)
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

## 🔐 Lista de Verificación de Seguridad

- [x] Archivo JSON de cuenta de servicio presente
- [x] Credenciales agregadas a `.gitignore`
- [x] Variables de entorno configuradas
- [ ] Volumen Docker montado como solo lectura (`:ro`)
- [ ] Permisos de archivo restringidos: `chmod 600 *.json`
- [ ] Nunca confirmar credenciales a Git
- [ ] Rotar claves regularmente (cada 90 días)
- [ ] Usar credenciales diferentes para dev/staging/production

---

## 📚 Recursos Adicionales

- [Documentación Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)
- [Referencia del Servidor FCM](https://firebase.google.com/docs/cloud-messaging/server)
- [Consola Firebase](https://console.firebase.google.com/project/soa-arch-soft)

---

## ✅ Qué Está Funcionando

✅ SDK Firebase Admin inicializado  
✅ Cuenta de servicio autenticada  
✅ Servicio Cloud Messaging disponible  
✅ Variables de entorno configuradas  
✅ Integración Docker Compose completa  
✅ Credenciales protegidas en `.gitignore`  

## 🎯 Próximos Pasos

1. **Obtener tokens de dispositivo** de tu aplicación móvil/web
2. **Almacenar tokens** en tabla `device_tokens`
3. **Crear un recordatorio** vía API
4. **Verificar notificación** recibida en dispositivo
5. **Monitorear registros** en Jaeger y Prometheus

---

**Configuración completada el:** 11 de noviembre de 2025  
**Proyecto:** soa-arch-soft  
**Estado:** ✅ Listo para Pruebas
