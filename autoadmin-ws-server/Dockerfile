FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json ./
RUN npm install

COPY tsconfig.json ./
COPY src ./src

RUN npm run build

FROM node:22-alpine

WORKDIR /app

RUN addgroup -g 1001 -S nodejs && \
  adduser -S nodejs -u 1001

COPY package.json ./
RUN npm install --omit=dev && npm cache clean --force

COPY --from=builder /app/dist ./dist

USER nodejs

EXPOSE 8008 8009

CMD ["node", "dist/index.js"]
