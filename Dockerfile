FROM node:18-slim AS front_builder
SHELL ["/bin/bash", "-c"]
WORKDIR /app/frontend
COPY frontend/package.json frontend/yarn.lock frontend/angular.json frontend/tsconfig.app.json frontend/tsconfig.json /app/frontend/
COPY frontend/.yarn /app/frontend/.yarn
RUN yarn install --immutable --network-timeout 1000000 --silent
COPY frontend/src /app/frontend/src
ARG SAAS
RUN if [[ -n $SAAS ]]; then API_ROOT=/api yarn build --configuration=saas-production; \
    else API_ROOT=/api yarn build; fi
RUN ls /app/frontend/dist/dissendium-v0

FROM node:18-slim
RUN apt-get update && apt-get install -y \
    tini nginx \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json .yarnrc.yml yarn.lock /app/
COPY backend /app/backend
COPY shared-code /app/shared-code
COPY rocketadmin-cli /app/rocketadmin-cli
COPY rocketadmin-agent /app/rocketadmin-agent
COPY private-modules /app/private-modules
COPY .yarn /app/.yarn
RUN yarn install --network-timeout 1000000 --frozen-lockfile --silent
RUN cd shared-code && ../node_modules/.bin/tsc
RUN cd private-modules && ( test -d node_modules && yarn run nest build || true )
RUN cd backend && yarn run nest build
COPY --from=front_builder /app/frontend/dist/dissendium-v0 /var/www/html
COPY frontend/nginx/default.conf /etc/nginx/sites-enabled/default
WORKDIR /app/backend
CMD [ "/app/backend/runner.sh" ]
ENTRYPOINT ["/app/backend/entrypoint.sh"]


ENV ORACLE_BASE /usr/lib/instantclient
ENV LD_LIBRARY_PATH /usr/lib/instantclient
ENV TNS_ADMIN /usr/lib/instantclient
ENV ORACLE_HOME /usr/lib/instantclient
ENV TYPEORM_CONNECTION postgres
ENV TYPEORM_MIGRATIONS dist/src/migrations/*.js
