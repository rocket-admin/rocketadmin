FROM node:20-slim AS front_builder
SHELL ["/bin/bash", "-c"]
WORKDIR /app/frontend
COPY frontend/package.json frontend/yarn.lock frontend/angular.json frontend/tsconfig.app.json frontend/tsconfig.json /app/frontend/
COPY frontend/.yarn /app/frontend/.yarn
RUN apt-get update && apt-get install -y \
    git \
    && rm -rf /var/lib/apt/lists/*
RUN yarn install --immutable --network-timeout 1000000 --silent
COPY frontend/src /app/frontend/src
ARG SAAS
RUN if [[ -n $SAAS ]]; then API_ROOT=/api yarn build --configuration=saas-production; \
    else API_ROOT=/api yarn build --configuration=production; fi
RUN ls /app/frontend/dist/dissendium-v0

FROM node:20
RUN apt-get update && apt-get install -y \
    tini nginx \
    make gcc g++ python3 \
    && rm -rf /var/lib/apt/lists/* 

WORKDIR /app
COPY package.json .yarnrc.yml yarn.lock /app/
COPY backend /app/backend
COPY shared-code /app/shared-code
COPY rocketadmin-agent /app/rocketadmin-agent
COPY .yarn /app/.yarn
RUN yarn install --network-timeout 1000000 --frozen-lockfile --silent
RUN cd shared-code && ../node_modules/.bin/tsc
RUN cd backend && yarn run nest build
COPY --from=front_builder /app/frontend/dist/dissendium-v0 /var/www/html
COPY frontend/nginx/default.conf /etc/nginx/sites-enabled/default
WORKDIR /app/backend
CMD [ "/app/backend/runner.sh" ]
ENTRYPOINT ["/app/backend/entrypoint.sh"]


ENV TYPEORM_CONNECTION postgres
ENV TYPEORM_MIGRATIONS dist/src/migrations/*.js
