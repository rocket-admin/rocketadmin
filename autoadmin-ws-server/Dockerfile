FROM node:18
WORKDIR /app
COPY package.json yarn.lock /app/
RUN yarn install --network-timeout 1000000
COPY . /app
EXPOSE 8008
CMD ["yarn", "start"]