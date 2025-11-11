# Multi-stage Dockerfile for Reminder Service
# Stage 1: Builder
FROM node:18-alpine AS builder

WORKDIR /build

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm install --production && \
    npm install && \
    npm cache clean --force

# Copy source code
COPY . ./

# Build TypeScript (exclude test and node_modules)
RUN npm run build

# Stage 2: Runtime
FROM node:18-alpine

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init curl postgresql-client

# Create non-root user
RUN addgroup -g 10001 appuser && \
    adduser -D -u 10001 -G appuser appuser

# Copy package files
COPY package*.json ./

# Copy node_modules from builder
COPY --from=builder /build/node_modules ./node_modules

# Copy compiled code from builder
COPY --from=builder /build/dist ./dist

# Copy other necessary files
COPY init.sql ./
COPY openapi.yaml ./

# Set permissions
RUN chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Expose port
EXPOSE 3000

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start application
CMD ["node", "dist/index.js"]
