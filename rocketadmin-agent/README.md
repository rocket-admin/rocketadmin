# Rocketadmin-agent

There are two options for installing Rocketadmin-agent: using Docker Desktop (for MacOS and Windows) or using Docker Engine (for Linux).

## Installing rocketadmin using docker

Open Terminal app and run following commands:

```bash

docker pull rocketadmin/rocketadmin-agent:latest
docker run -it rocketadmin/rocketadmin-agent:latest

```

Running these commands will start the application in interactive mode, displaying a command line dialog where you can enter the necessary connection parameters.

## Install via Docker Compose

First step is installing [Docker Engine](https://docker.com).
On Linux, please install [Docker Compose](https://docs.docker.com/compose/install/) as well.

> Note: Docker Desktop on Windows and MacOS already include Docker Compose.

Second step – create **docker-compose.yml** file.
Copy and paste configuration from [(source file)](https://github.com/rocket-admin/rocketadmin/tree/main/rocketadmin-agent/docker-compose.yml) or download this file.

Third step – create **.config.env** file in the same directory.
Copy and paste the contents of [(source file)](https://github.com/rocket-admin/rocketadmin/tree/main/rocketadmin-agent/.config.env) or download this file.

Fourth step – open **.config.env** file and specify all required credentials.

Open Terminal app and run:

```sh
docker compose up --build
```

After sucessfull execution, new connection will appear in Rocketadmin Connections List.
