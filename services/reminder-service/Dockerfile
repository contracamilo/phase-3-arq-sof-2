FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

# Install production dependencies (use npm install because package-lock.json may be absent)
RUN npm install --omit=dev

# Copy compiled output (this repo already contains a `dist/` directory)
COPY dist ./dist

# Copy OpenAPI spec and other assets required at runtime
COPY openapi.yaml ./openapi.yaml
COPY init.sql ./init.sql
EXPOSE 3000

CMD ["node", "dist/index.js"]
