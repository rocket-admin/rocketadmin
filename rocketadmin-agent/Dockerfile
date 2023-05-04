FROM node:18
WORKDIR /app
COPY package.json ./yarn.lock .yarnrc.yml /app/
COPY ./.yarn /app/.yarn
COPY ./rocketadmin-agent/package.json /app/rocketadmin-agent/
COPY shared-code/package.json /app/shared-code/
RUN yarn install --network-timeout 1000000
COPY ./rocketadmin-agent/src /app/rocketadmin-agent/src
COPY ./rocketadmin-agent/storage /app/rocketadmin-agent/storage
COPY ./rocketadmin-agent/tsconfig.json /app/rocketadmin-agent/
COPY ./rocketadmin-agent/tsconfig.build.json /app/rocketadmin-agent/
COPY ./rocketadmin-agent/.autoadmin-config.txt /app/rocketadmin-agent/
COPY shared-code /app/shared-code
COPY ./rocketadmin-agent/ssl-cert.txt /app/rocketadmin-agent/

RUN cd rocketadmin-agent && yarn run nest build
CMD [ "./node_modules/.bin/nest", "start"]

RUN apt update
RUN apt install libaio1 libc6 curl -y && \
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

ENV ORACLE_BASE /usr/lib/instantclient
ENV LD_LIBRARY_PATH /usr/lib/instantclient
ENV TNS_ADMIN /usr/lib/instantclient
ENV ORACLE_HOME /usr/lib/instantclient