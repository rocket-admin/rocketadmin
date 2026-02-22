FROM node:24-alpine AS builder

WORKDIR /app

COPY package.json yarn.lock ./
RUN yarn install

COPY tsconfig.json ./
COPY src ./src

RUN yarn build

FROM node:24-alpine

WORKDIR /app

RUN addgroup -g 1001 -S nodejs && \
  adduser -S nodejs -u 1001

COPY package.json yarn.lock ./
RUN yarn install --production && yarn cache clean

COPY --from=builder /app/dist ./dist

USER 1001

EXPOSE 8008 8009

CMD ["node", "dist/index.js"]
