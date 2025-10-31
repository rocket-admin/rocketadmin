## Rocket Admin

![720](https://github.com/rocket-admin/rocketadmin/assets/75169/31f1ac1b-ded0-40b6-984a-e50a3ddc4ee2)

Create admin panel for your service with a few clicks

## Installation

In order to set up a Docker container with the `rocketadmin/rocketadmin` image and configure the required environment variables, follow these steps:

1. Install Docker on your system, if you haven't already. You can find installation instructions for different operating systems on the official Docker website: https://docs.docker.com/get-docker/

2. Pull the `rocketadmin/rocketadmin` image from the Docker Hub:

```bash
docker pull rocketadmin/rocketadmin
# or
podman pull quay.io/rocketadmin/rocketadmin
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
  -e OPENAI_API_KEY=<openai_api_key>
  -p 8080:8080 \
  --name rocketadmin \
  rocketadmin/rocketadmin
```

5. Your `rocketadmin/rocketadmin` container should now be running and accessible on port 8080 of your host system. You can verify that the container is running by executing:

## Enviroment variables

The provided Docker command example includes several environment variables. Here's a documentation outline for each of these variables:

1. **PGLITE_FOLDER_PATH** or **DATABASE_URL**: This environment variable is used to set the internal rocketadmin database connection string. The DATABASE_URL format is `postgresql://username:password@host/database[?ssl_mode=require]`, where:

   - `username`: Your database username.
   - `password`: Your database password.
   - `host`: The hostname or IP address of your database server.
   - `database`: The specific database name to connect to.
   - `?ssl_mode=require` (optional): Connect to the database using TLS

2. **JWT_SECRET**: This variable is used for setting the JSON Web Token (JWT) secret. It's a key used for signing and verifying JWT tokens. This should be a secure, random string at least 64 characters long.

3. **PRIVATE_KEY**: This environment variable is used to set a private key. It's used for encryption of the database credentials. The key should be kept confidential and not shared publicly. This also should be a secure, random string at least 64 characters long.

4. **TEMPORARY_JWT_SECRET**: Similar to `JWT_SECRET`, this is also used for JWT token operations. It may be used as a secondary key for temporary tokens or during token rotation processes.

5. **APP_DOMAIN_ADDRESS** (optional): This sets the domain address of your application. The format is a URL, such as `https://rocketadmin.yourcompany.internal`. This address is used for internal links or email messages.
6. **EMAIL_CONFIG_STRING**: Settings for connecting to an SMTP server for email sending in an application. It follows the format `smtps://username:password@smtp.example.com/?pool=true`, where smtps:// indicates a secure SMTP connection using SSL/TLS encryption. username and password are the credentials for the SMTP server, smtp.example.com is the server address, and the pool=true query parameter enables connection pooling for efficient management of multiple email transmissions. More information about the parameters you can find in the nodemailer npm module documentation
7. **EMAIL_FROM** (optional): Emails will be sent from this email

8. **OPENAI_API_KEY** (optional): This API key is used to authenticate requests to the OpenAI service. It allows the application to access OpenAI's language models and other AI functionalities. You can obtain this key by signing up for an API key on the OpenAI website. If this key is not provided, any features relying on OpenAI services will be disabled.

Each of these environment variables plays a crucial role in the configuration and security of the RocketAdmin application. It's important to ensure that sensitive information like `JWT_SECRET`, `PRIVATE_KEY`, and `TEMPORARY_JWT_SECRET` are kept secure and are not exposed in publicly accessible areas of your code or repositories. Additionally, the `DATABASE_URL` should be set correctly to ensure that the application can successfully connect to your database.

To add instructions for installing RocketAdmin using Helm to the README, you can include the following section:

## Helm Installation

You can install RocketAdmin using Helm by following these steps:

1. **Add RocketAdmin Helm Repository:**

   ```sh
   helm repo add rocketadmin https://charts.rocketadmin.com/
   helm repo update
   ```

2. **Install RocketAdmin:**

   ```sh
   helm install my-rocketadmin rocketadmin/rocketadmin
   ```

   Replace `my-rocketadmin` with your desired release name.

3. **Configure Values:**

   You can customize the installation by creating a `values.yaml` file and specifying your configurations. Then install with:

   ```sh
   helm install my-rocketadmin -f values.yaml rocketadmin/rocketadmin
   ```

For more details, refer to the [Rocketadmin Charts repository](https://artifacthub.io/packages/helm/rocketadmin/rocketadmin).

---

This section provides clear and concise instructions for installing RocketAdmin using Helm, suitable for inclusion in the README file.

## Usage

1. After installation rocketadmin will create a user with email admin@email.local and autogenerated password. The message will be `Admin user created with email: "admin@email.local" and password: "<password>"`
2. You can sign in using these credentials. We recommend to change email and password after first login
