import { NestFactory } from '@nestjs/core';
import Sentry from '@sentry/node';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { ApplicationModule } from './app.module.js';
import { AllExceptionsFilter } from './exceptions/all-exceptions.filter.js';
import { Constants } from './helpers/constants/constants.js';
import { requiredEnvironmentVariablesValidator } from './helpers/validators/required-environment-variables.validator.js';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  try {
    requiredEnvironmentVariablesValidator();
    const appOptions = {
      rawBody: true,
    };
    const app = await NestFactory.create(ApplicationModule, appOptions);

    Sentry.init({
      dsn: process.env.SENTRY_DSN,
    });

    const globalPrefix = process.env.GLOBAL_PREFIX || '/';
    app.setGlobalPrefix(globalPrefix);

    app.useGlobalFilters(new AllExceptionsFilter());

    app.use(helmet());

    app.use(cookieParser());

    app.enableCors({
      origin: [
        'https://app.autoadmin.org',
        'http://localhost:4200',
        'https://app.rocketadmin.org',
        Constants.APP_DOMAIN_ADDRESS,
      ],
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

    const config = new DocumentBuilder()
      .setTitle('Rocketadmin')
      .setDescription('The Rocketadmin API description')
      .setVersion('1.0')
      .addTag('rocketadmin')
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, document);

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
