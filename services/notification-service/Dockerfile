# Multi-stage build for Notification Service
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install ALL dependencies (including devDependencies for build)
RUN npm install && \
    npm cache clean --force

# Copy source code
COPY . ./

# Build TypeScript
RUN npm run build

# Remove devDependencies after build
RUN npm prune --production

# Production stage
FROM node:20-alpine

WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy built application
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/package.json ./

# Copy Firebase credentials if provided
# COPY firebase-service-account.json ./

# Switch to non-root user
USER nodejs

# Health check (check if process is running)
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD ps aux | grep -v grep | grep node || exit 1

# Start consumer
CMD ["node", "dist/consumer.js"]
