FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS production

WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev && npm install tsx express cors multer
COPY server ./server
COPY --from=builder /app/dist ./dist
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 3001

ENV NODE_ENV=production
ENV SCRIPTS_DIR=/app/scripts-data

RUN mkdir -p /app/scripts-data

CMD ["npx", "tsx", "server/index.ts"]
