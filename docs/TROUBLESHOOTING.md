# 🔧 Guía de Troubleshooting

Soluciones para problemas comunes durante desarrollo, testing y despliegue.

## 🚨 Errores Comunes

### Puerto Ya Está en Uso

**Síntoma:**
```
Error: listen EADDRINUSE :::3000
```

**Soluciones:**

```bash
# Ver qué proceso usa el puerto
lsof -i :3000

# Matar proceso por PID
kill -9 <PID>

# O cambiar puerto en .env
PORT=3001

# O usar otro puerto en CLI
npm run dev -- --port 3001
```

### No Puede Conectar a PostgreSQL

**Síntoma:**
```
Error: connect ECONNREFUSED 127.0.0.1:5432
Error: database does not exist
```

**Soluciones:**

```bash
# Verificar que Docker está corriendo
docker ps

# Verificar PostgreSQL específicamente
docker ps | grep postgres

# Ver logs de PostgreSQL
docker logs postgres

# Reiniciar PostgreSQL
docker restart postgres

# Reiniciar todo
npm run docker:down
npm run docker:clean
npm run docker:up

# Verificar conexión manualmente
docker exec postgres psql -U postgres -l
```

### No Puede Conectar a RabbitMQ

**Síntoma:**
```
Error: connection refused
Error: channel error
```

**Soluciones:**

```bash
# Verificar RabbitMQ en Docker
docker ps | grep rabbitmq

# Ver logs
docker logs rabbitmq

# Verificar puerto 5672 (AMQP)
curl localhost:5672
# Debería recibir error de conexión (normal)

# Reiniciar RabbitMQ
docker restart rabbitmq

# Acceso a Management UI
http://localhost:15672
# usuario: guest
# contraseña: guest
```

### Database Does Not Exist

**Síntoma:**
```
Error: database "reminder_db" does not exist
```

**Soluciones:**

```bash
# Ejecutar init script manualmente
docker exec postgres psql -U postgres -f /docker-entrypoint-initdb.d/init.sql

# O recrear volúmenes
npm run docker:down
npm run docker:clean
npm run docker:up

# Verificar bases de datos creadas
docker exec postgres psql -U postgres -l
```

**Esperado:**
```
                                   List of databases
       Name       |  Owner   | Encoding |   Collate   |    Ctype    |   Access privileges
------------------+----------+----------+-------------+-------------+-----------------------
 reminder_db      | postgres | UTF8     | en_US.utf8  | en_US.utf8  |
 auth_db          | postgres | UTF8     | en_US.utf8  | en_US.utf8  |
 notification_db  | postgres | UTF8     | en_US.utf8  | en_US.utf8  |
```

### TypeScript Compilation Error

**Síntoma:**
```
error TS2307: Cannot find module '@types/express'
error TS1219: Experimental decorators not enabled
```

**Soluciones:**

```bash
# Reinstalar dependencias
npm install

# Limpiar build anterior
npm run clean

# Rebuild
npm run build

# Verificar tsconfig.json
cat tsconfig.json | grep -A5 "compilerOptions"

# Esperado: "experimentalDecorators": true
```

### Module Not Found Error

**Síntoma:**
```
Cannot find module './config'
Cannot find module 'swagger-ui-express'
```

**Soluciones:**

```bash
# En root, reinstalar deps de todos
npm run install:all

# O en servicio específico
cd services/auth-service
npm install

# Verificar package.json tiene la dependencia
cat package.json | grep "swagger-ui-express"

# Si no está, agregarla
npm install swagger-ui-express js-yaml
npm install --save-dev @types/swagger-ui-express @types/js-yaml

# Rebuild
npm run build
```

### Hot Reload Not Working

**Síntoma:**
```
Changes no se reflejan cuando modificas archivos
```

**Soluciones:**

```bash
# Asegurar que usas npm run dev (no node)
npm run dev

# Verificar que nodemon está instalado
npm list nodemon

# Si no está, agregarlo
npm install --save-dev nodemon

# Verificar package.json dev script
cat package.json | grep "dev"

# Debería tener nodemon
# "dev": "nodemon --exec ts-node src/index.ts"
```

## 🌐 Errores de Red

### Swagger UI No Carga

**Síntoma:**
```
http://localhost:3000/api-docs → Blank page
http://localhost:3000/api-docs → 404 Not Found
```

**Soluciones:**

```bash
# Verificar que servicio está corriendo
curl http://localhost:3000/health

# Verificar endpoint /api-docs existe
curl http://localhost:3000/api-docs

# Ver logs del servicio
docker logs reminder-service | tail -50

# Buscar errores de Swagger
docker logs reminder-service | grep -i swagger

# Reiniciar servicio
docker restart reminder-service

# Rebuild imagen
docker compose up --build reminder-service
```

### CORS Error

**Síntoma:**
```
Access to XMLHttpRequest at 'http://localhost:3000/api/...'
from origin 'http://localhost:3001' has been blocked by CORS policy
```

**Soluciones:**

```bash
# Verificar CORS habilitado en app.ts
grep -r "cors" services/*/src/app.ts

# Agregar CORS si falta
npm install cors
# En app.ts:
# import cors from 'cors';
# app.use(cors());

# O especificar origins
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true
}));

# Rebuild y reiniciar
npm run build
docker restart reminder-service
```

### Connection Timeout

**Síntoma:**
```
Error: connect ETIMEDOUT 127.0.0.1:3000
```

**Soluciones:**

```bash
# Verificar que servicio está respondiendo
curl -v http://localhost:3000/health

# Ver logs
docker logs reminder-service

# Aumentar timeout en cliente
# En test o cliente, aumentar timeout
curl --max-time 30 http://localhost:3000/health

# Verificar firewall/networking
docker network ls
docker network inspect bridge
```

## 📝 Errores de Aplicación

### InvalidTokenError

**Síntoma:**
```
Error: InvalidTokenError: jwt malformed
```

**Soluciones:**

```bash
# Verificar JWT_SECRET en .env
cat .env | grep JWT_SECRET

# Debería estar set
JWT_SECRET=your-secret-key

# Generar nuevo token
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"test"}'

# Copiar token en header
curl -H "Authorization: Bearer <token>" \
  http://localhost:3000/api/reminders
```

### RabbitMQ Queue Errors

**Síntoma:**
```
Error: Queue 'reminder_due' not found
Error: No consumers available
```

**Soluciones:**

```bash
# Verificar colas disponibles
docker exec rabbitmq rabbitmqctl list_queues

# Crear cola si falta
docker exec rabbitmq rabbitmqctl add_queue reminder_due

# Verificar consumers
docker exec rabbitmq rabbitmqctl list_connections

# Reiniciar servicio de notificaciones
docker restart notification-service

# Ver logs
docker logs notification-service | grep -i rabbitmq
```

### Database Constraint Error

**Síntoma:**
```
Error: violates unique constraint "reminders_pkey"
Error: violates foreign key constraint
```

**Soluciones:**

```bash
# Ver schema actual
docker exec postgres psql -U postgres -d reminder_db -c "\d reminders"

# Ver constraints
docker exec postgres psql -U postgres -d reminder_db -c "\d+ reminders"

# Limpiar datos conflictivos
docker exec postgres psql -U postgres -d reminder_db -c "DELETE FROM reminders WHERE id = 'duplicate_id';"

# Resetear base de datos completa (⚠️ borra todo)
npm run docker:down
npm run docker:clean
npm run docker:up
```

## 🧪 Errores de Testing

### Jest Not Found

**Síntoma:**
```
Command 'jest' not found
```

**Soluciones:**

```bash
# Instalar Jest
npm install --save-dev jest ts-jest @types/jest

# Crear jest.config.js
npx jest --init

# Ejecutar tests
npm run test
```

### Test Timeout

**Síntoma:**
```
Jest did not exit one second after the test run has completed
```

**Soluciones:**

```bash
# Aumentar timeout
jest --testTimeout=10000

# O en jest.config.js
module.exports = {
  testTimeout: 10000
};

# O en test específico
test('something', async () => {
  // ...
}, 10000);
```

### Test Cannot Connect to Database

**Síntoma:**
```
Error: connect ECONNREFUSED during tests
```

**Soluciones:**

```bash
# Asegurar que Docker está corriendo
npm run docker:up

# Esperar a que servicios estén ready
sleep 5
npm run test

# O aumentar delay en test
beforeAll(async () => {
  await new Promise(resolve => setTimeout(resolve, 5000));
  // Conectar a DB
});
```

## 🐳 Errores de Docker

### Docker Container Not Starting

**Síntoma:**
```
Error response from daemon: driver failed programming external connectivity
```

**Soluciones:**

```bash
# Ver logs del contenedor
docker logs <container_id>

# Verificar que puertos no están en uso
lsof -i :3000
lsof -i :5432
lsof -i :5672

# Limpiar Docker
docker system prune -a

# Reiniciar Docker daemon
# macOS: restart Docker Desktop
# Linux: sudo systemctl restart docker
```

### Build Fails with "No space left on device"

**Síntoma:**
```
Error: no space left on device during docker build
```

**Soluciones:**

```bash
# Ver uso de disco
docker system df

# Limpiar imágenes sin usar
docker image prune -a

# Limpiar contenedores
docker container prune

# Limpiar volúmenes
docker volume prune

# O completo
docker system prune -a --volumes
```

### Docker Compose Port Conflicts

**Síntoma:**
```
Error: for reminder-service: Bind for 0.0.0.0:3000 failed: port is already allocated
```

**Soluciones:**

```bash
# Ver puertos en uso
docker ps

# Cambiar puerto en docker-compose.yml
# De: "3000:3000"
# A: "3001:3000"

# O matar proceso en puerto
lsof -i :3000
kill -9 <PID>

# Reiniciar compose
npm run docker:down
npm run docker:up
```

## 📊 Problemas de Performance

### Slow Database Queries

**Síntoma:**
```
Query takes > 1000ms
```

**Soluciones:**

```bash
# Ver query log
docker exec postgres psql -U postgres -d reminder_db -c \
  "SELECT query, mean_time FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;"

# Crear índice si falta
docker exec postgres psql -U postgres -d reminder_db -c \
  "CREATE INDEX idx_reminders_user_id ON reminders(user_id);"

# Ver plan de ejecución
docker exec postgres psql -U postgres -d reminder_db -c \
  "EXPLAIN ANALYZE SELECT * FROM reminders WHERE user_id = 'user1';"
```

### High Memory Usage

**Síntoma:**
```
Memory usage > 500MB
Memory leak suspected
```

**Soluciones:**

```bash
# Ver memoria por contenedor
docker stats

# Limitar memoria en docker-compose.yml
services:
  reminder-service:
    deploy:
      resources:
        limits:
          memory: 512M

# Buscar memory leaks en logs
docker logs reminder-service | grep -i "memory\|heap"

# Hacer heap dump
node --inspect=0.0.0.0:9229 src/index.ts

# Conectar Chrome DevTools
# chrome://inspect
```

### Many Open Connections

**Síntoma:**
```
Error: too many connections
FATAL: sorry, too many clients already
```

**Soluciones:**

```bash
# Ver conexiones activas
docker exec postgres psql -U postgres -c \
  "SELECT datname, count(*) FROM pg_stat_activity GROUP BY datname;"

# Aumentar max_connections en postgres
docker exec postgres psql -U postgres -c \
  "ALTER SYSTEM SET max_connections = 200;"

# Reiniciar PostgreSQL
docker restart postgres

# Usar connection pooling (PgBouncer, etc)
```

## 🆘 Debugging Avanzado

### Habilitar Debug Mode

```bash
# En .env
DEBUG=*
LOG_LEVEL=trace
NODE_ENV=development

# O en comando
DEBUG=* npm run dev
```

### Conectar Debugger

**VSCode:**

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "attach",
      "name": "Attach to Docker",
      "port": 9229,
      "address": "127.0.0.1",
      "skipFiles": ["<node_internals>/**"]
    }
  ]
}
```

```bash
# Iniciar con inspect
node --inspect=0.0.0.0:9229 src/index.ts

# O en Docker
docker run -p 9229:9229 -e NODE_OPTIONS="--inspect=0.0.0.0:9229" my-service
```

### Ver Stack Traces

```bash
# En logs
docker logs -f reminder-service | grep -A10 "Error\|Stack"

# Aumentar verbosidad
LOG_LEVEL=trace npm run dev
```

## 📞 Obtener Ayuda

Si el problema persiste:

1. **Revisar logs completos:**
   ```bash
   docker logs <service> > /tmp/logs.txt
   ```

2. **Crear issue en GitHub** con:
   - Descripción del problema
   - Steps para reproducir
   - Logs completos
   - Versión de Node/Docker

3. **Contactar al equipo** en Slack/Discord con detalles

---

**Actualizado:** 11 Nov 2025
**Versión:** 1.0.0
