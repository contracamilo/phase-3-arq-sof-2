# 🔐 Guía de Autenticación y OIDC

Configuración de OAuth2, OIDC y JWT para el Auth Service.

## 🏗️ Arquitectura de Autenticación

```
Usuario ↔ Cliente (App/Web) ↔ Auth Service ↔ OIDC Provider (Keycloak/Azure/Google)
                                    ↓
                            JWT Token + Refresh
                                    ↓
                        Reminder Service / Other Services
```

## 🔧 Configuración Inicial

### Sin OIDC (Desarrollo Simple)

Por defecto, el servicio usa autenticación local sin OIDC:

```bash
# En .env
OIDC_ENABLED=false
JWT_SECRET=your-development-secret-key
JWT_EXPIRATION=3600  # 1 hora
REFRESH_TOKEN_EXPIRATION=604800  # 7 días
```

### Con OIDC (Recomendado para Producción)

```bash
# En .env
OIDC_ENABLED=true
OIDC_PROVIDER_URL=https://your-provider.com/auth/realms/master
OIDC_CLIENT_ID=your-app
OIDC_CLIENT_SECRET=your-secret
OIDC_REDIRECT_URI=http://localhost:3001/api/auth/callback
JWT_SECRET=your-jwt-secret
```

## 🔑 OIDC Providers

### Keycloak (Recomendado para Desarrollo)

**Instalación Local:**

```bash
# Con Docker
docker run -d \
  -p 8080:8080 \
  -e KEYCLOAK_ADMIN=admin \
  -e KEYCLOAK_ADMIN_PASSWORD=admin \
  quay.io/keycloak/keycloak:latest \
  start-dev

# Acceso
# URL: http://localhost:8080
# Usuario: admin
# Contraseña: admin
```

**Configuración en Keycloak:**

1. Abre http://localhost:8080/admin
2. Crea Realm: "microservices"
3. Crea Client: "reminder-app"
   - Client Type: OpenID Connect
   - Client Authentication: On (confidential)
   - Valid Redirect URIs: `http://localhost:3001/api/auth/callback`
4. Crea Usuario: "test"
   - Contraseña: "test123"
   - Temporary: Off

**En `.env` del Auth Service:**

```bash
OIDC_ENABLED=true
OIDC_PROVIDER_URL=http://localhost:8080/realms/microservices
OIDC_CLIENT_ID=reminder-app
OIDC_CLIENT_SECRET=<obtener de Keycloak Client>
OIDC_REDIRECT_URI=http://localhost:3001/api/auth/callback
```

### Google Cloud (OAuth 2.0)

**Crear OAuth 2.0 Credentials:**

1. Abre [Google Cloud Console](https://console.cloud.google.com)
2. Crea Proyecto
3. Habilita Google+ API
4. Crea OAuth 2.0 Client ID:
   - Type: Web application
   - Authorized Redirect URIs: `http://localhost:3001/api/auth/callback`
5. Copia Client ID y Secret

**En `.env`:**

```bash
OIDC_ENABLED=true
OIDC_PROVIDER_URL=https://accounts.google.com
OIDC_CLIENT_ID=<your-client-id>.apps.googleusercontent.com
OIDC_CLIENT_SECRET=<your-client-secret>
OIDC_REDIRECT_URI=http://localhost:3001/api/auth/callback
GOOGLE_DISCOVERY_URL=https://accounts.google.com/.well-known/openid-configuration
```

### Azure AD (Microsoft 365)

**Registrar Aplicación:**

1. Abre [Azure Portal](https://portal.azure.com)
2. Azure Active Directory → App registrations
3. New registration:
   - Name: "Reminder App"
   - Redirect URI: `http://localhost:3001/api/auth/callback`
4. Copiar Client ID y Tenant ID
5. Crea Client Secret

**En `.env`:**

```bash
OIDC_ENABLED=true
OIDC_PROVIDER_URL=https://login.microsoftonline.com/<tenant-id>/v2.0
OIDC_CLIENT_ID=<your-client-id>
OIDC_CLIENT_SECRET=<your-client-secret>
OIDC_REDIRECT_URI=http://localhost:3001/api/auth/callback
```

## 🔐 JWT Tokens

### Estructura

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
```

**Header:**
```json
{
  "alg": "HS256",
  "typ": "JWT"
}
```

**Payload:**
```json
{
  "sub": "user-id",
  "email": "user@example.com",
  "name": "John Doe",
  "iat": 1516239022,
  "exp": 1516242622,
  "iss": "auth-service",
  "aud": "reminder-service"
}
```

### Crear Token (Desarrollo)

```bash
# Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "user",
    "password": "password"
  }'

# Respuesta
{
  "access_token": "eyJhbGc...",
  "refresh_token": "eyJhbGc...",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

### Usar Token

```bash
# Enviar en header Authorization
curl http://localhost:3000/api/reminders \
  -H "Authorization: Bearer eyJhbGc..."
```

### Validar Token

```bash
# Endpoint especial para validar
curl http://localhost:3001/api/auth/validate \
  -H "Authorization: Bearer eyJhbGc..."

# Respuesta
{
  "valid": true,
  "sub": "user-id",
  "email": "user@example.com",
  "exp": 1516242622
}
```

### Refresh Token

```bash
# Obtener nuevo access token
curl -X POST http://localhost:3001/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refresh_token": "eyJhbGc..."
  }'

# Respuesta
{
  "access_token": "eyJhbGc...",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

## 📋 Flujos de Autenticación

### 1. Local Authentication (Sin OIDC)

```
1. POST /api/auth/login
   ├─ Validar credenciales vs BD
   ├─ Generar JWT token
   ├─ Generar refresh token
   └─ Retornar tokens

2. Cliente guarda token en localStorage

3. GET /api/reminders (con Authorization header)
   ├─ Middleware valida JWT
   ├─ Extrae user_id del token
   └─ Autoriza request
```

### 2. OIDC Authorization Code Flow

```
1. Usuario hace click en "Login with OIDC"

2. Cliente redirige a:
   https://oidc-provider/authorize?
     client_id=...&
     redirect_uri=http://localhost:3001/api/auth/callback&
     scope=openid+profile+email&
     response_type=code&
     state=...

3. Usuario se autentica en OIDC Provider

4. OIDC Provider redirige a callback:
   http://localhost:3001/api/auth/callback?
     code=authorization_code&
     state=...

5. Auth Service intercambia code:
   POST /token (a OIDC Provider)
   ├─ Envía: code + client_id + client_secret
   └─ Recibe: id_token + access_token + refresh_token

6. Auth Service:
   ├─ Valida id_token
   ├─ Extrae user info
   ├─ Crea/actualiza usuario en BD
   ├─ Genera JWT token
   └─ Redirige a cliente

7. Cliente usa JWT token para requests
```

## 🛡️ Middleware de Autenticación

### Verificar Token

```typescript
// En src/middleware/auth.middleware.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};
```

### Uso en Routes

```typescript
import { authMiddleware } from '../middleware/auth.middleware';

router.get('/api/reminders', authMiddleware, async (req, res) => {
  // req.user contiene la información del token
  const userId = req.user.sub;
  // ...
});
```

## 🔄 Integración con Otros Servicios

### Reminder Service Valida Tokens

El Reminder Service debe validar tokens del Auth Service:

```typescript
// En src/middleware/validation.middleware.ts
const token = req.headers.authorization?.split(' ')[1];

// Opción 1: Validar signature localmente (sincrónico)
jwt.verify(token, process.env.JWT_SECRET);

// Opción 2: Validar contra Auth Service (seguro)
const response = await fetch('http://auth-service:3001/api/auth/validate', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const { valid, sub } = await response.json();
```

## 🧪 Testing de Autenticación

### Test Local Login

```bash
# 1. Login
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"user","password":"password"}' \
  | jq -r '.access_token')

# 2. Usar token
curl http://localhost:3000/api/reminders \
  -H "Authorization: Bearer $TOKEN" \
  | jq

# 3. Validar token
curl http://localhost:3001/api/auth/validate \
  -H "Authorization: Bearer $TOKEN" \
  | jq
```

### Test OIDC Flow

```bash
# 1. Obtener authorization code (manual en browser)
# Abre: http://localhost:3001/api/auth/authorize

# 2. Callback recibe code
# http://localhost:3001/api/auth/callback?code=...

# 3. Exchange code por token
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/callback \
  -H "Content-Type: application/json" \
  -d '{"code":"..."}' \
  | jq -r '.access_token')

# 4. Usar token
curl http://localhost:3000/api/reminders \
  -H "Authorization: Bearer $TOKEN" \
  | jq
```

## 🆘 Troubleshooting

### "Invalid Token" Error

```bash
# Verificar JWT_SECRET es igual en Auth y otros servicios
grep JWT_SECRET .env

# Recrear token
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"test"}'

# Usar nuevo token
curl http://localhost:3000/api/reminders \
  -H "Authorization: Bearer <new-token>"
```

### "OIDC Provider Not Responding"

```bash
# Verificar OIDC_PROVIDER_URL es correcto
curl https://your-provider/.well-known/openid-configuration

# Verificar OIDC_CLIENT_ID y OIDC_CLIENT_SECRET
# Ir a provider admin y verificar

# Aumentar timeout en .env
OIDC_TIMEOUT=10000
```

### "Redirect URI Mismatch"

```bash
# Debe coincidir exactamente en:
# 1. OIDC_REDIRECT_URI en .env
# 2. Registered Redirect URI en OIDC Provider

# Común: http vs https, puerto, path
# Incorrecto: http://localhost:3001/callback
# Correcto:   http://localhost:3001/api/auth/callback
```

## 📚 Recursos

- [OAuth 2.0 Spec](https://tools.ietf.org/html/rfc6749)
- [OpenID Connect Spec](https://openid.net/specs/openid-connect-core-1_0.html)
- [JWT.io](https://jwt.io/)
- [Keycloak Docs](https://www.keycloak.org/documentation)

---

**Actualizado:** 11 Nov 2025
**Versión:** 1.0.0
