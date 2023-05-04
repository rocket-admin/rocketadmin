## Rocket Admin

Create admin panel for your service with a few clicks

## Installation

In order to set up a Docker container with the `rocketadmin/rocketadmin` image and configure the required environment variables, follow these steps:

1. Install Docker on your system, if you haven't already. You can find installation instructions for different operating systems on the official Docker website: https://docs.docker.com/get-docker/

2. Pull the `rocketadmin/rocketadmin` image from the Docker Hub:

```bash
docker pull rocketadmin/rocketadmin
```

3. Generate a random 64-character string for the JWT_SECRET variable. You can use an online tool like https://randomkeygen.com/ or create it using a script in your preferred programming language.

4. Now, you're ready to run the Docker container. Use the `docker run` command with the `-e` flag to set each environment variable. Replace `<variable_value>` with your actual values for each variable:

```bash
docker run -d \
  -e TYPEORM_HOST=<typeorm_host> \
  -e TYPEORM_USERNAME=<typeorm_username> \
  -e TYPEORM_PASSWORD=<typeorm_password> \
  -e TYPEORM_DATABASE=<typeorm_database> \
  -e JWT_SECRET=<jwt_secret> \
  -e PRIVATE_KEY=<private_key> \
  -p 8080:8080 \
  --name rocketadmin \
  rocketadmin/rocketadmin
```

5. If the `PRIVATE_KEY` is optional and you don't want to set it, simply remove the corresponding line:

```bash
docker run -d \
  -e TYPEORM_HOST=<typeorm_host> \
  -e TYPEORM_USERNAME=<typeorm_username> \
  -e TYPEORM_PASSWORD=<typeorm_password> \
  -e TYPEORM_DATABASE=<typeorm_database> \
  -e JWT_SECRET=<jwt_secret> \
  -p 8080:8080 \
  --name rocketadmin \
  rocketadmin/rocketadmin
```

6. Your `rocketadmin/rocketadmin` container should now be running and accessible on port 8080 of your host system. You can verify that the container is running by executing:

```bash
docker ps
```

If you need to stop the container, use the following command:

```bash
docker stop rocketadmin
```

To start the container again, run:

```bash
docker start rocketadmin
```

And to remove the container completely, execute:

```bash
docker rm rocketadmin
```

Remember to replace `<variable_value>` with the appropriate values for your setup.
