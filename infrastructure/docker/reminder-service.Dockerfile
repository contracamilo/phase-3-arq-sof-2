FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci --only=production

COPY tsconfig.json ./
COPY src ./src

RUN npm install -g typescript
RUN npm run build

EXPOSE 3000

CMD ["node", "dist/index.js"]
