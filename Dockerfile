FROM node:24.22.1-slim AS front_builder
ARG VERSION
ARG SAAS
SHELL ["/bin/bash", "-c"]
RUN npm install -g pnpm@10.33.0
WORKDIR /app/frontend
COPY frontend/package.json frontend/pnpm-lock.yaml frontend/pnpm-workspace.yaml /app/frontend/
RUN --mount=type=cache,target=/root/.local/share/pnpm/store pnpm install --frozen-lockfile
COPY frontend/.env frontend/.env.production frontend/.env.saas-production frontend/index.html frontend/index.saas.html frontend/vite.config.ts frontend/tsconfig.json frontend/tsconfig.app.json frontend/tsconfig.node.json /app/frontend/
COPY frontend/scripts /app/frontend/scripts
COPY frontend/public /app/frontend/public
COPY frontend/src /app/frontend/src

# Update version if VERSION build arg is provided (the build scripts write src/version.ts)
RUN if [[ -n $VERSION ]]; then \
    echo "Updating package.json version to $VERSION" && \
    npm version $VERSION --no-git-tag-version; \
    fi

RUN if [[ -n $SAAS ]]; then pnpm build:saas; else pnpm build; fi
RUN ls /app/frontend/dist

FROM node:24.22.1-slim

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
COPY --from=front_builder /app/frontend/dist /var/www/html
COPY frontend/nginx/default.conf /etc/nginx/sites-enabled/default
RUN mkdir -p /app/backend/node_modules/.cache && chown -R appuser:appuser /app/backend/node_modules/.cache
# c8 report dir for `just test-coverage` (the test compose runs this image as appuser)
RUN mkdir -p /app/backend/coverage && chown appuser:appuser /app/backend/coverage
RUN chown -R appuser:appuser  /var/lib/nginx
RUN chown -R appuser:appuser  /var/log/nginx
RUN chown -R appuser:appuser  /run

USER 1001

WORKDIR /app/backend
ENTRYPOINT ["/app/backend/entrypoint.sh"]
CMD [ "/app/backend/runner.sh" ]
