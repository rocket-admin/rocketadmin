FROM node:20
WORKDIR /app
RUN apt-get update && apt-get install -y netcat-openbsd
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
COPY ./rocketadmin-agent/.oracle_test_agent_config.txt /app/rocketadmin-agent/
COPY ./rocketadmin-agent/.postgres_test_agent_config.txt /app/rocketadmin-agent/
COPY ./rocketadmin-agent/.mysql_test_agent_config.txt /app/rocketadmin-agent/
COPY ./rocketadmin-agent/.mssql_test_agent_config.txt /app/rocketadmin-agent/
COPY ./rocketadmin-agent/.ibmdb2_test_agent_config.txt /app/rocketadmin-agent/
COPY shared-code /app/shared-code
COPY ./rocketadmin-agent/ssl-cert.txt /app/rocketadmin-agent/
RUN cd shared-code && ../node_modules/.bin/tsc
RUN cd rocketadmin-agent && yarn run nest build
CMD [ "./node_modules/.bin/nest", "start"]
