#!/bin/bash

# Wait for Keycloak to be ready
echo "Waiting for Keycloak to be ready..."
until curl -f http://localhost:8080/realms/master/.well-known/openid-connect-configuration > /dev/null 2>&1; do
  echo "Keycloak is not ready yet..."
  sleep 5
done

echo "Keycloak is ready. Configuring realm and client..."

# Get admin token
ADMIN_TOKEN=$(curl -s -X POST http://localhost:8080/realms/master/protocol/openid-connect/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin&password=admin&grant_type=password&client_id=admin-cli" | jq -r '.access_token')

if [ -z "$ADMIN_TOKEN" ]; then
  echo "Failed to get admin token"
  exit 1
fi

# Create SOA realm
curl -s -X POST http://localhost:8080/admin/realms \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "realm": "soa-realm",
    "enabled": true,
    "displayName": "SOA Architecture Platform",
    "registrationAllowed": false,
    "loginWithEmailAllowed": true,
    "duplicateEmailsAllowed": false,
    "resetPasswordAllowed": true,
    "editUsernameAllowed": false,
    "bruteForceProtected": true
  }'

# Create client
curl -s -X POST http://localhost:8080/admin/realms/soa-realm/clients \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "soa-client",
    "name": "SOA Client",
    "description": "Client for SOA Architecture Platform",
    "enabled": true,
    "protocol": "openid-connect",
    "clientAuthenticatorType": "client-secret",
    "secret": "client-secret",
    "directAccessGrantsEnabled": true,
    "serviceAccountsEnabled": true,
    "implicitFlowEnabled": false,
    "standardFlowEnabled": true,
    "publicClient": false,
    "redirectUris": [
      "http://localhost:3001/auth/callback",
      "http://localhost:3000/auth/callback"
    ],
    "webOrigins": [
      "http://localhost:3001",
      "http://localhost:3000"
    ]
  }'

# Create roles
curl -s -X POST http://localhost:8080/admin/realms/soa-realm/roles \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "student",
    "description": "Student role"
  }'

curl -s -X POST http://localhost:8080/admin/realms/soa-realm/roles \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "teacher",
    "description": "Teacher role"
  }'

curl -s -X POST http://localhost:8080/admin/realms/soa-realm/roles \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "admin",
    "description": "Administrator role"
  }'

# Create test users
curl -s -X POST http://localhost:8080/admin/realms/soa-realm/users \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "student1",
    "email": "student1@university.edu",
    "firstName": "John",
    "lastName": "Student",
    "enabled": true,
    "emailVerified": true,
    "credentials": [{
      "type": "password",
      "value": "password123",
      "temporary": false
    }]
  }'

curl -s -X POST http://localhost:8080/admin/realms/soa-realm/users \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "teacher1",
    "email": "teacher1@university.edu",
    "firstName": "Jane",
    "lastName": "Teacher",
    "enabled": true,
    "emailVerified": true,
    "credentials": [{
      "type": "password",
      "value": "password123",
      "temporary": false
    }]
  }'

# Assign roles to users
STUDENT_ID=$(curl -s http://localhost:8080/admin/realms/soa-realm/users?username=student1 \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq -r '.[0].id')

TEACHER_ID=$(curl -s http://localhost:8080/admin/realms/soa-realm/users?username=teacher1 \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq -r '.[0].id')

if [ -n "$STUDENT_ID" ]; then
  curl -s -X POST http://localhost:8080/admin/realms/soa-realm/users/$STUDENT_ID/role-mappings/realm \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d '[{"id": "'$(curl -s http://localhost:8080/admin/realms/soa-realm/roles/student \
      -H "Authorization: Bearer $ADMIN_TOKEN" | jq -r '.id')'", "name": "student"}]'
fi

if [ -n "$TEACHER_ID" ]; then
  curl -s -X POST http://localhost:8080/admin/realms/soa-realm/users/$TEACHER_ID/role-mappings/realm \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d '[{"id": "'$(curl -s http://localhost:8080/admin/realms/soa-realm/roles/teacher \
      -H "Authorization: Bearer $ADMIN_TOKEN" | jq -r '.id')'", "name": "teacher"}]'
fi

echo "Keycloak configuration completed successfully!"
echo "Access Keycloak Admin Console at: http://localhost:8080"
echo "Username: admin"
echo "Password: admin"
echo ""
echo "SOA Realm: soa-realm"
echo "Client ID: soa-client"
echo "Client Secret: client-secret"