FROM public.ecr.aws/docker/library/node:18
RUN apt-get update && apt-get install -y \
    tini \
    && rm -rf /var/lib/apt/lists/*
RUN apt update && \
    apt install libaio1 libc6 curl -y && \
    cd /tmp && \
    curl -o instantclient-basiclite.zip https://download.oracle.com/otn_software/linux/instantclient/instantclient-basiclite-linuxx64.zip -SL && \
    unzip instantclient-basiclite.zip && \
    mv instantclient*/ /usr/lib/instantclient && \
    rm instantclient-basiclite.zip && \
    ln -s /usr/lib/instantclient/libclntsh.so.19.1 /usr/lib/libclntsh.so && \
    ln -s /usr/lib/instantclient/libocci.so.19.1 /usr/lib/libocci.so && \
    ln -s /usr/lib/instantclient/libociicus.so /usr/lib/libociicus.so && \
    ln -s /usr/lib/instantclient/libnnz19.so /usr/lib/libnnz19.so && \
    ln -s /usr/lib/libnsl.so.2 /usr/lib/libnsl.so.1 && \
    ln -s /lib/libc.so.6 /usr/lib/libresolv.so.2 && \
    ln -s /lib64/ld-linux-x86-64.so.2 /usr/lib/ld-linux-x86-64.so.2

WORKDIR /app
COPY package.json .yarnrc.yml yarn.lock /app/
COPY backend /app/backend
COPY shared-code /app/shared-code
COPY rocketadmin-cli /app/rocketadmin-cli
COPY rocketadmin-agent /app/rocketadmin-agent
COPY private-modules /app/private-modules
COPY .yarn /app/.yarn
RUN yarn set version berry
RUN yarn install --network-timeout 1000000 --frozen-lockfile
RUN cd shared-code && ../node_modules/.bin/tsc
RUN cd private-modules && yarn install --network-timeout 1000000
RUN cd private-modules && yarn run nest build
RUN cd backend && yarn run nest build
WORKDIR /app/backend
CMD [ "tini", "node", "--", "--enable-source-maps", "dist/main.js"]
ENTRYPOINT ["/app/backend/entrypoint.sh"]


ENV ORACLE_BASE /usr/lib/instantclient
ENV LD_LIBRARY_PATH /usr/lib/instantclient
ENV TNS_ADMIN /usr/lib/instantclient
ENV ORACLE_HOME /usr/lib/instantclient
ENV TYPEORM_CONNECTION postgres
ENV TYPEORM_MIGRATIONS dist/src/migrations/*.js
