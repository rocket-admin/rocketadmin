FROM node:20
WORKDIR /app
RUN apt-get update && apt-get install -y netcat-openbsd
COPY package.json ./yarn.lock .yarnrc.yml /app/
COPY ./.yarn /app/.yarn
COPY ./rocketadmin-cli/package.json /app/rocketadmin-cli/
COPY shared-code/package.json /app/shared-code/
RUN yarn install --network-timeout 1000000
COPY ./rocketadmin-cli/src /app/rocketadmin-cli/src
COPY ./rocketadmin-cli/tsconfig.json /app/rocketadmin-cli/
COPY ./rocketadmin-cli/tsconfig.build.json /app/rocketadmin-cli/
COPY ./rocketadmin-cli/.autoadmin-config.txt /app/rocketadmin-cli/
COPY ./rocketadmin-cli/.oracle_test_cli_config.txt /app/rocketadmin-cli/
COPY ./rocketadmin-cli/.postgres_test_cli_config.txt /app/rocketadmin-cli/
COPY ./rocketadmin-cli/.mysql_test_cli_config.txt /app/rocketadmin-cli/
COPY ./rocketadmin-cli/.mssql_test_cli_config.txt /app/rocketadmin-cli/
COPY ./rocketadmin-cli/.ibmdb2_test_cli_config.txt /app/rocketadmin-cli/
COPY shared-code /app/shared-code

RUN cd shared-code && ../node_modules/.bin/tsc
RUN cd rocketadmin-cli && yarn run nest build
CMD [ "./node_modules/.bin/nest", "start"]
