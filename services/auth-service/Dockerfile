FROM node:18-alpine

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init postgresql-client

# Create non-root user (avoid failure if group exists)
RUN addgroup appuser || true && adduser -D appuser || true

# Copy package files and install production deps
COPY package*.json ./
RUN npm install --omit=dev

# Copy compiled output and assets
COPY dist ./dist
COPY init.sql ./init.sql
COPY .env.example ./

# Run as default user (root) to avoid runtime user resolution issues with bind mounts in compose

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3001/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

EXPOSE 3001

ENTRYPOINT ["dumb-init", "--"]

CMD ["node", "dist/index.js"]
