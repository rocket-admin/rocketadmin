FROM public.ecr.aws/docker/library/node:18
RUN apt-get update && apt-get install -y \
    tini \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json yarn.lock nest-cli.json /app/
RUN yarn install --network-timeout 1000000
COPY . /app
RUN yarn run nest build
CMD [ "tini", "node", "--", "--enable-source-maps", "dist/main.js"]
ENTRYPOINT ["/app/entrypoint.sh"]

RUN apt update && \
    apt install libaio1 libc6 curl -y && \
    cd /tmp && \
    curl -o instantclient-basiclite.zip https://download.oracle.com/otn_software/linux/instantclient/instantclient-basiclite-linuxx64.zip -sl && \
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

ENV ORACLE_BASE /usr/lib/instantclient
ENV LD_LIBRARY_PATH /usr/lib/instantclient
ENV TNS_ADMIN /usr/lib/instantclient
ENV ORACLE_HOME /usr/lib/instantclient
ENV TYPEORM_CONNECTION postgres
ENV TYPEORM_MIGRATIONS dist/src/migrations/*.js
