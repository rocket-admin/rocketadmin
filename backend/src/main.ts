import * as cookieParser from 'cookie-parser';
import * as helmet from 'helmet';
import * as rateLimit from 'express-rate-limit';
import * as Sentry from '@sentry/node';
import { AllExceptionsFilter } from './exceptions/all-exceptions.filter';
import { ApplicationModule } from './app.module';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Constants } from './helpers/constants/constants';
import { requiredEnvironmentVariablesValidator } from './helpers/validators/required-environment-variables.validator';
import { Encryptor } from './helpers/encryption/encryptor';

// eslint-disable-next-line @typescript-eslint/no-var-requires
require('dotenv').config();

async function bootstrap() {
  try {
    console.error(Encryptor.generateRandomString());
    requiredEnvironmentVariablesValidator();
    const appOptions = {};
    const app = await NestFactory.create(ApplicationModule, appOptions);

    Sentry.init({
      dsn: process.env.SENTRY_DSN,
    });

    app.useGlobalFilters(new AllExceptionsFilter());

    const options = new DocumentBuilder()
      .setTitle('auto-admin')
      .setDescription('The autoadmin API description')
      .setVersion('0.0.1')
      .addTag('auto-admin')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, options);
    SwaggerModule.setup('api', app, document);

    app.use(helmet());

    app.use(cookieParser());

    app.enableCors({
      origin: ['https://app.autoadmin.org', 'http://localhost:4200', Constants.APP_DOMAIN_ADDRESS],
      methods: 'GET,PUT,PATCH,POST,DELETE',
      credentials: true,
      preflightContinue: false,
      optionsSuccessStatus: 204,
    });

    const apiLimiter = rateLimit({
      windowMs: 60 * 1000,
      max: 200,
    });

    app.use('/api/', apiLimiter);
    app.use(cookieParser());
    await app.listen(3000);
  } catch (e) {
    console.error(`Failed to initialize, due to ${e}`);
    process.exit(1);
  }
}

const temp = process.exit;

process.exit = function () {
  console.trace();
  process.exit = temp;
  process.exit();
};

bootstrap().catch((e) => {
  console.error(`Bootstrap promise failed with error: ${e}`);
  process.exit(1);
});
