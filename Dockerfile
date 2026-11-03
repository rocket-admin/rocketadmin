# Which frontend goes into the image: angular (frontend/) or vue (frontend-vue/).
# During the Vue trial period this is the one switch between them (VUE_MIGRATION_PLAN.md, Phase 4).
ARG FRONTEND=angular

FROM node:24-slim AS front_builder_angular
ARG VERSION
ARG SAAS
SHELL ["/bin/bash", "-c"]
WORKDIR /app/frontend
COPY frontend/package.json frontend/yarn.lock frontend/.yarnrc.yml frontend/angular.json frontend/browserslist frontend/tsconfig.app.json frontend/tsconfig.json /app/frontend/
COPY frontend/.yarn /app/frontend/.yarn
RUN apt-get update && apt-get install -y \
    git \
    && rm -rf /var/lib/apt/lists/*
RUN --mount=type=cache,target=/root/.yarn YARN_CACHE_FOLDER=/root/.yarn yarn install --immutable --network-timeout 1000000 --silent
COPY frontend/scripts /app/frontend/scripts
COPY frontend/src /app/frontend/src

# Update version if VERSION build arg is provided
RUN if [[ -n $VERSION ]]; then \
    cd frontend; \
    echo "Updating package.json version to $VERSION" && \
    npm version $VERSION --no-git-tag-version && \
    yarn update-version; \
    fi

RUN if [[ -n $SAAS ]]; then API_ROOT=/api yarn build --configuration=saas-production; \
    else API_ROOT=/api yarn build --configuration=production; fi
RUN ls /app/frontend/dist/rocketadmin/browser
RUN mv /app/frontend/dist/rocketadmin/browser /app/frontend-dist

FROM node:24-slim AS front_builder_vue
ARG VERSION
ARG SAAS
SHELL ["/bin/bash", "-c"]
RUN npm install -g pnpm@10.33.0
WORKDIR /app/frontend-vue
COPY frontend-vue/package.json frontend-vue/pnpm-lock.yaml frontend-vue/pnpm-workspace.yaml /app/frontend-vue/
RUN --mount=type=cache,target=/root/.local/share/pnpm/store pnpm install --frozen-lockfile
# The Vue build still copies its static assets from the Angular app (vite.config.ts).
COPY frontend/src/assets /app/frontend/src/assets
COPY frontend-vue/.env frontend-vue/.env.production frontend-vue/.env.saas-production frontend-vue/index.html frontend-vue/index.saas.html frontend-vue/vite.config.ts frontend-vue/tsconfig.json frontend-vue/tsconfig.app.json frontend-vue/tsconfig.node.json /app/frontend-vue/
COPY frontend-vue/scripts /app/frontend-vue/scripts
COPY frontend-vue/public /app/frontend-vue/public
COPY frontend-vue/src /app/frontend-vue/src

# Update version if VERSION build arg is provided (the build scripts write src/version.ts)
RUN if [[ -n $VERSION ]]; then \
    echo "Updating package.json version to $VERSION" && \
    npm version $VERSION --no-git-tag-version; \
    fi

RUN if [[ -n $SAAS ]]; then pnpm build:saas; else pnpm build; fi
RUN ls /app/frontend-vue/dist
RUN mv /app/frontend-vue/dist /app/frontend-dist

FROM front_builder_${FRONTEND} AS front_builder

FROM node:24-slim

RUN groupadd -r -g 1001 appuser && useradd -r -u 1001 -g appuser -d /app -s /sbin/nologin appuser

RUN apt-get update && apt-get install -y \
    tini nginx \
    make gcc g++ python3 \
    libxml2 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
RUN npm install -g pnpm@10.33.0
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc /app/
COPY backend /app/backend
COPY shared-code /app/shared-code
COPY rocketadmin-agent /app/rocketadmin-agent
RUN --mount=type=cache,target=/root/.local/share/pnpm/store pnpm install --frozen-lockfile
RUN cd shared-code && ../node_modules/.bin/tsc
RUN cd backend && ../node_modules/.bin/tsc && pnpm exec nest build
COPY --from=front_builder /app/frontend-dist /var/www/html
COPY frontend/nginx/default.conf /etc/nginx/sites-enabled/default
RUN mkdir -p /app/backend/node_modules/.cache && chown -R appuser:appuser /app/backend/node_modules/.cache
RUN chown -R appuser:appuser  /var/lib/nginx
RUN chown -R appuser:appuser  /var/log/nginx
RUN chown -R appuser:appuser  /run

USER 1001

WORKDIR /app/backend
ENTRYPOINT ["/app/backend/entrypoint.sh"]
CMD [ "/app/backend/runner.sh" ]
