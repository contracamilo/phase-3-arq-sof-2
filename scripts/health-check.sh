#!/bin/bash

# SOA Platform Health Check Script
# Tests all services health endpoints and basic functionality

set -e

echo "🔍 Starting SOA Platform Health Check..."
echo "========================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check service health
check_service() {
  local service_name=$1
  local url=$2
  local expected_status=${3:-200}

  echo -n "Checking $service_name... "

  if curl -s -f -o /dev/null -w "%{http_code}" "$url" | grep -q "^$expected_status$"; then
    echo -e "${GREEN}✅ OK${NC}"
    return 0
  else
    echo -e "${RED}❌ FAILED${NC}"
    return 1
  fi
}

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 10

FAILED_SERVICES=()

# Check PostgreSQL
echo -n "Checking PostgreSQL... "
if docker exec reminders-postgres pg_isready -U postgres -h localhost > /dev/null 2>&1; then
  echo -e "${GREEN}✅ OK${NC}"
else
  echo -e "${RED}❌ FAILED${NC}"
  FAILED_SERVICES+=("PostgreSQL")
fi

# Check RabbitMQ
echo -n "Checking RabbitMQ... "
if curl -s http://guest:guest@localhost:15672/api/overview > /dev/null 2>&1; then
  echo -e "${GREEN}✅ OK${NC}"
else
  echo -e "${RED}❌ FAILED${NC}"
  FAILED_SERVICES+=("RabbitMQ")
fi

# Check Keycloak
echo -n "Checking Keycloak... "
if curl -s -f http://localhost:8080/realms/master/.well-known/openid-connect-configuration > /dev/null 2>&1; then
  echo -e "${GREEN}✅ OK${NC}"
else
  echo -e "${RED}❌ FAILED${NC}"
  FAILED_SERVICES+=("Keycloak")
fi

# Check Reminder Service
check_service "Reminder Service" "http://localhost:3000/health" || FAILED_SERVICES+=("Reminder Service")

# Check Auth Service
check_service "Auth Service" "http://localhost:3001/health" || FAILED_SERVICES+=("Auth Service")

# Check Notification Service
check_service "Notification Service" "http://localhost:3002/health" || FAILED_SERVICES+=("Notification Service")

# Check Jaeger (optional)
echo -n "Checking Jaeger... "
if curl -s -f http://localhost:16686/api/services > /dev/null 2>&1; then
  echo -e "${GREEN}✅ OK${NC}"
else
  echo -e "${YELLOW}⚠️  NOT AVAILABLE${NC}"
fi

# Check Prometheus (optional)
echo -n "Checking Prometheus... "
if curl -s -f http://localhost:9090/-/ready > /dev/null 2>&1; then
  echo -e "${GREEN}✅ OK${NC}"
else
  echo -e "${YELLOW}⚠️  NOT AVAILABLE${NC}"
fi

echo ""
echo "========================================"

if [ ${#FAILED_SERVICES[@]} -eq 0 ]; then
  echo -e "${GREEN}🎉 All core services are healthy!${NC}"
  echo ""
  echo "🚀 SOA Platform is ready!"
  echo ""
  echo "Service URLs:"
  echo "• Reminder Service: http://localhost:3000"
  echo "• Auth Service: http://localhost:3001"
  echo "• Notification Service: http://localhost:3002"
  echo "• Keycloak: http://localhost:8080"
  echo "• RabbitMQ Management: http://localhost:15672"
  echo "• Jaeger UI: http://localhost:16686"
  echo "• Prometheus: http://localhost:9090"
  echo ""
  echo "Test users:"
  echo "• Student: student1 / password123"
  echo "• Teacher: teacher1 / password123"
  echo ""
  echo "Next steps:"
  echo "1. Run setup-keycloak.sh to configure Keycloak realm"
  echo "2. Test API endpoints with Postman or curl"
  echo "3. Check service logs: docker compose logs -f <service-name>"
else
  echo -e "${RED}❌ Some services failed health checks:${NC}"
  printf '• %s\n' "${FAILED_SERVICES[@]}"
  echo ""
  echo "Troubleshooting:"
  echo "• Check service logs: docker compose logs <service-name>"
  echo "• Verify Docker containers: docker ps"
  echo "• Restart services: docker compose restart"
  exit 1
fi