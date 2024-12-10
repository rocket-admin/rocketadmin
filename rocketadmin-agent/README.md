# Rocketadmin-agent

There are two options for installing Rocketadmin-agent: using Docker Desktop (for MacOS and Windows) or using Docker Engine (for Linux).

## Installing rocketadmin using docker

Open Terminal app and run following commands:

```bash
docker pull rocketadmin/rocketadmin-agent:latest
```

```bash
docker run -it rocketadmin/rocketadmin-agent:latest
```

(Note: If you run the RocketAdmin agent in a Docker container and your database is located on the "localhost" of your machine, you should add the --network=host option to the docker run command. The command will look like this:

```bash
docker run -it --network=host rocketadmin/rocketadmin-agent:latest
```

Also, note that in this case, the database host should be changed from "localhost" (or 127.0.0.1) to "host.docker.internal" due to Docker's networking features. For hosts other than "localhost", the command and host do not need to be changed.)

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

To avoid starting the container in interactive mode, you can pass environment variables directly in the `docker run` command:

```bash
docker run -d \
  -p 3000:3000 \ # Maps port 3000 of the host to port 3000 of the container
  --name rocketadmin \
  -e CONNECTION_TOKEN=my_secure_token \ # Token for connecting to the database
  -e CONNECTION_TYPE=postgres \ # Type of the database (e.g., postgres, mysql)
  -e CONNECTION_HOST=localhost \ # Hostname or IP address of the database
  -e CONNECTION_PORT=5432 \ # Port number of the database
  -e CONNECTION_USERNAME=my_db_user \ # Username for the database
  -e CONNECTION_PASSWORD=my_db_password \ # Password for the database
  -e CONNECTION_DATABASE=my_database \ # Name of the database
  -e CONNECTION_SCHEMA=public \ # Schema of the database
  -e CONNECTION_SID= \ # SID for Oracle databases (leave empty if not using Oracle)
  -e CONNECTION_SSL=0 \ # Set to 1 to use SSL
  -e CONNECTION_SSL_CERTIFICATE=my_ssl_certificate \ # SSL certificate text value
  -e LOGS_TO_TEXT_FILE=0 \ # Set to 1 to write logs to a file
  -e CONNECTION_AZURE_ENCRYPTION=0 \ # Set to 1 to enable encryption for MSSQL in Azure
  -e APP_PORT=3000 \ # Port where the application will run (default is 3000)
  rocketadmin/rocketadmin-agent:latest
```

You can also run the project in Docker Compose mode by creating a `docker-compose.yml` file (an example can be found in the root of the `rocketadmin-agent` repository folder). Open the folder containing this file in your terminal and run the command `docker compose up`.

(Note: You can also create a `.config.env` file, an example of which can be found in the root of the `rocketadmin-agent` repository folder. Fill in all necessary variables and reference it in the `docker-compose.yml` file.)
