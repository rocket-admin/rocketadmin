# Rocketadmin-agent

There are two options for installing Rocketadmin-agent: using Docker Desktop (for MacOS and Windows) or using Docker Engine (for Linux).

## Installing rocketadmin using docker

Open Terminal app and run following commands:

```bash

docker pull rocketadmin/rocketadmin-agent:latest
docker run -it rocketadmin/rocketadmin-agent:latest

```

Running these commands will start the application in interactive mode, displaying a command line dialog where you can enter the necessary connection parameters.

## Build rocketadmin docker image from code

Clone the Rocketadmin Git Repository:

```bash

git clone https://github.com/rocket-admin/rocketadmin.git

```

Alternatively, download the ZIP archive, extract it, and open the containing folder in your terminal.

Build the Docker Image:

```bash

docker build -t rocketadmin-agent -f Dockerfile.rocketadmin-agent .

```

Run the Application in Interactive Mode:

```bash

docker run -it rocketadmin-agent

```
