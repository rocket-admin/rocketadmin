FROM public.ecr.aws/docker/library/node:18-alpine as builder
ARG VERSION
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn global add @angular/cli && yarn install
COPY angular.json browserslist tsconfig.app.json tsconfig.json tslint.json ./
COPY scripts ./scripts/
COPY src ./src/

# Update version if VERSION build arg is provided
RUN if [ -n "$VERSION" ]; then \
    echo "Updating package.json version to $VERSION" && \
    npm version $VERSION --no-git-tag-version && \
    yarn update-version; \
  fi

RUN ng build --configuration=production

FROM public.ecr.aws/docker/library/nginx:alpine
COPY --from=builder /app/dist/dissendium-v0/ /usr/share/nginx/html/
COPY nginx/default.conf.template /etc/nginx/templates/
