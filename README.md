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
  -e DATABASE_URL=postgresql://username:password@host/database \
  -e JWT_SECRET=<jwt_secret> \
  -e PRIVATE_KEY=<private_key> \
  -e TEMPORARY_JWT_SECRET=<temporary_jwt_secret>
  -e APP_DOMAIN_ADDRESS=https://rocketadmin.yourcompany.internal
  -p 8080:8080 \
  --name rocketadmin \
  rocketadmin/rocketadmin
```

5. Your `rocketadmin/rocketadmin` container should now be running and accessible on port 8080 of your host system. You can verify that the container is running by executing:

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
