# Autoadmin-agent

There are two options for installing Autoadmin-agent: using Docker Desktop (for MacOS and Windows) or using Docker Engine (for Linux).


## Installing autoadmin using docker

Open Terminal app and run following commands:

```bash

docker pull autoadmin/agent
docker run -e CONNECTION_TOKEN=connection_token -e CONNECTION_TYPE=mysql -e CONNECTION_USERNAME=your_username \
    -e CONNECTION_PASSWORD=your_password -e CONNECTION_HOST=example.com autoadmin/agent
```

## Install via Docker Compose

First step is installing [Docker Engine](https://docker.com).
On Linux, please install [Docker Compose](https://docs.docker.com/compose/install/) as well.
> Note: Docker Desktop on Windows and MacOS already include Docker Compose.

Second step – create **docker-compose.yml** file. 
Copy and paste configuration from [(source file)](https://github.com/Autoadmin-org/autoadmin-agent/blob/master/docker-compose.yml) or download this file.

Third step – create **.config.env** file in the same directory. 
Copy and paste the contents of [(source file)](https://github.com/Autoadmin-org/autoadmin-agent/blob/master/.config.env) or download this file.

Fourth step – open **.config.env** file and specify all required credentials.


Open Terminal app and run:

```sh
docker-compose up --build
```
After sucessfull execution, new connection will appear in Autoadmin Connections List.
