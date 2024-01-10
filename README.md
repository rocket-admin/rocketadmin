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

## Enviroment variables

The provided Docker command example includes several environment variables. Here's a documentation outline for each of these variables:

1. **DATABASE_URL**: This environment variable is used to set the database connection string. The format is `postgresql://username:password@host/database[?ssl_mode=require]`, where:
   - `username`: Your database username.
   - `password`: Your database password.
   - `host`: The hostname or IP address of your database server.
   - `database`: The specific database name to connect to.
   - `?ssl_mode=require` (optional): Connect to the database using TLS

2. **JWT_SECRET**: This variable is used for setting the JSON Web Token (JWT) secret. It's a key used for signing and verifying JWT tokens. This should be a secure, random string at least 64 characters long.

3. **PRIVATE_KEY**: This environment variable is used to set a private key. It's used for encryption of the database credentials. The key should be kept confidential and not shared publicly.

4. **TEMPORARY_JWT_SECRET**: Similar to `JWT_SECRET`, this is also used for JWT token operations. It may be used as a secondary key for temporary tokens or during token rotation processes.

5. **APP_DOMAIN_ADDRESS** (optional): This sets the domain address of your application. The format is a URL, such as `https://rocketadmin.yourcompany.internal`. This address is typically used for internal links or email messages.

Each of these environment variables plays a crucial role in the configuration and security of the RocketAdmin application. It's important to ensure that sensitive information like `JWT_SECRET`, `PRIVATE_KEY`, and `TEMPORARY_JWT_SECRET` are kept secure and are not exposed in publicly accessible areas of your code or repositories. Additionally, the `DATABASE_URL` should be set correctly to ensure that the application can successfully connect to your database.
