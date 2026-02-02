FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

COPY tsconfig.json ./
COPY src ./src

RUN yarn build

FROM node:22-alpine

WORKDIR /app

RUN addgroup -g 1001 -S nodejs && \
  adduser -S nodejs -u 1001

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --production && yarn cache clean

COPY --from=builder /app/dist ./dist

USER nodejs

EXPOSE 8008 8009

CMD ["node", "dist/index.js"]
