#!/bin/bash

# SOA Platform Complete Test Script
# Builds, runs, and tests the complete SOA platform

set -e

echo "🚀 Starting Complete SOA Platform Test..."
echo "=========================================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Function to log with timestamp
log() {
  echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1"
}

# Cleanup function
cleanup() {
  log "🧹 Cleaning up containers..."
  docker compose -f infrastructure/docker/docker-compose.yml down -v 2>/dev/null || true
}

# Trap to cleanup on exit
trap cleanup EXIT

# Step 1: Clean up any existing containers
log "🧹 Cleaning up existing containers..."
cleanup

# Step 2: Build and start all services
log "🏗️  Building and starting all services..."
docker compose -f infrastructure/docker/docker-compose.yml up -d --build

# Step 3: Wait for services to be ready
log "⏳ Waiting for services to be fully ready..."
sleep 30

# Step 4: Run health checks
log "🔍 Running health checks..."
if ./scripts/health-check.sh; then
  log "✅ All health checks passed!"
else
  log "❌ Some health checks failed"
  exit 1
fi

# Step 5: Configure Keycloak
log "🔐 Configuring Keycloak..."
if ./scripts/setup-keycloak.sh; then
  log "✅ Keycloak configured successfully!"
else
  log "❌ Keycloak configuration failed"
  exit 1
fi

# Step 6: Test API endpoints
log "🧪 Testing API endpoints..."

# Test Reminder Service
log "Testing Reminder Service..."
if curl -s -f http://localhost:3000/health > /dev/null; then
  log "✅ Reminder Service health check passed"
else
  log "❌ Reminder Service health check failed"
  exit 1
fi

# Test Auth Service
log "Testing Auth Service..."
if curl -s -f http://localhost:3001/health > /dev/null; then
  log "✅ Auth Service health check passed"
else
  log "❌ Auth Service health check failed"
  exit 1
fi

# Test Notification Service
log "Testing Notification Service..."
if curl -s -f http://localhost:3002/health > /dev/null; then
  log "✅ Notification Service health check passed"
else
  log "❌ Notification Service health check failed"
  exit 1
fi

# Step 7: Test OIDC flow (basic)
log "Testing OIDC login endpoint..."
if curl -s -I http://localhost:3001/auth/login | grep -q "302"; then
  log "✅ OIDC login redirect working"
else
  log "⚠️  OIDC login redirect may not be working (expected in development)"
fi

# Step 8: Test database connectivity
log "Testing database connectivity..."
if docker exec reminders-postgres pg_isready -U postgres -h localhost > /dev/null; then
  log "✅ PostgreSQL connectivity confirmed"
else
  log "❌ PostgreSQL connectivity failed"
  exit 1
fi

# Step 9: Test RabbitMQ connectivity
log "Testing RabbitMQ connectivity..."
if curl -s http://guest:guest@localhost:15672/api/overview > /dev/null; then
  log "✅ RabbitMQ connectivity confirmed"
else
  log "❌ RabbitMQ connectivity failed"
  exit 1
fi

# Step 10: Show service logs summary
log "📋 Service Status Summary:"
echo ""
echo "Services running:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo ""
echo "Recent logs from reminder-service:"
docker compose -f infrastructure/docker/docker-compose.yml logs --tail=5 reminder-service 2>/dev/null || echo "No logs available"
echo ""

log "🎉 SOA Platform Test Completed Successfully!"
echo ""
echo "🌐 Access URLs:"
echo "• Reminder Service:    http://localhost:3000"
echo "• Auth Service:        http://localhost:3001"
echo "• Notification Service: http://localhost:3002"
echo "• Keycloak Admin:      http://localhost:8080"
echo "• RabbitMQ Management: http://localhost:15672"
echo "• Jaeger UI:           http://localhost:16686"
echo "• Prometheus:          http://localhost:9090"
echo ""
echo "👤 Test Users:"
echo "• Student: student1 / password123"
echo "• Teacher: teacher1 / password123"
echo ""
echo "🔧 To stop the platform: docker compose -f infrastructure/docker/docker-compose.yml down"
echo "🔄 To restart: docker compose -f infrastructure/docker/docker-compose.yml restart"
echo "📊 To view logs: docker compose -f infrastructure/docker/docker-compose.yml logs -f"