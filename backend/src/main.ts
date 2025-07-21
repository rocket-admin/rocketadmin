import { NestApplicationOptions, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as Sentry from '@sentry/node';
import bodyParser from 'body-parser';
import { ValidationError } from 'class-validator';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import session from 'express-session';
import helmet from 'helmet';
import { ApplicationModule } from './app.module.js';
import { WinstonLogger } from './entities/logging/winston-logger.js';
import { AllExceptionsFilter } from './exceptions/all-exceptions.filter.js';
import { ValidationException } from './exceptions/custom-exceptions/validation-exception.js';
import { Constants } from './helpers/constants/constants.js';
import { requiredEnvironmentVariablesValidator } from './helpers/validators/required-environment-variables.validator.js';

async function bootstrap() {
  try {
    requiredEnvironmentVariablesValidator();
    const appOptions: NestApplicationOptions = {
      rawBody: true,
      logger: new WinstonLogger(),
    };

    const app = await NestFactory.create<NestExpressApplication>(ApplicationModule, appOptions);
    app.useLogger(app.get(WinstonLogger));
    app.set('query parser', 'extended');

    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      tracesSampleRate: 1.0,
    });

    const globalPrefix = process.env.GLOBAL_PREFIX || '/';
    app.setGlobalPrefix(globalPrefix);

    app.useGlobalFilters(new AllExceptionsFilter());

    app.use(helmet());

    app.use(cookieParser());

    const cookieDomain = process.env.ROCKETADMIN_COOKIE_DOMAIN || undefined;
    app.use(
      session({
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
        cookie: {
          secure: true,
          domain: cookieDomain,
          maxAge: 2 * 60 * 60 * 1000,
          httpOnly: true,
        },
        name: 'rocketadmin.sid',
      }),
    );

    app.enableCors({
      origin: [
        'https://app.autoadmin.org',
        'http://localhost:4200',
        'https://app.rocketadmin.org',
        'https://saas.rocketadmin.com',
        'https://app-beta.rocketadmin.com',
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

    app.use(bodyParser.json({ limit: '10mb' }));
    app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));

    const config = new DocumentBuilder()
      .setTitle('Rocketadmin')
      .setDescription('The Rocketadmin API description')
      .setVersion('1.0')
      .addTag('rocketadmin')
      .setBasePath(globalPrefix)
      .addApiKey({
        type: 'apiKey',
        name: 'x-api-key',
        in: 'header',
      })
      .addCookieAuth(Constants.JWT_COOKIE_KEY_NAME)
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, document);

    app.useGlobalPipes(
      new ValidationPipe({
        exceptionFactory(validationErrors: ValidationError[] = []) {
          return new ValidationException(validationErrors);
        },
      }),
    );

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
