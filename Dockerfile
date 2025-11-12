# syntax=docker/dockerfile:1.4
ARG NODE_VERSION=18-alpine
ARG SERVICE_PATH=services/notification-service
ARG SERVICE_PORT=3002

FROM node:${NODE_VERSION} AS deps
ARG SERVICE_PATH
WORKDIR /workspace/${SERVICE_PATH}
COPY ${SERVICE_PATH}/package*.json ./
RUN npm install

FROM node:${NODE_VERSION} AS builder
ARG SERVICE_PATH
WORKDIR /workspace/${SERVICE_PATH}
COPY --from=deps /workspace/${SERVICE_PATH}/node_modules ./node_modules
COPY ${SERVICE_PATH}/ .
RUN npm run build

FROM node:${NODE_VERSION} AS runner
ARG SERVICE_PATH
ARG SERVICE_PORT
ENV NODE_ENV=production \
    PORT=${SERVICE_PORT}
WORKDIR /app
RUN apk add --no-cache dumb-init
COPY --from=builder /workspace/${SERVICE_PATH}/dist ./dist
COPY --from=builder /workspace/${SERVICE_PATH}/package*.json ./
COPY --from=deps /workspace/${SERVICE_PATH}/node_modules ./node_modules
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD node -e "require('http').get('http://localhost:${SERVICE_PORT}/health',(r)=>{if(r.statusCode!==200)process.exit(1)})"
EXPOSE ${SERVICE_PORT}
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]
