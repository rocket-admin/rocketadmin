import { NestApplicationOptions, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as Sentry from '@sentry/node';
import bodyParser from 'body-parser';
import { ValidationError } from 'class-validator';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { ApplicationModule } from './app.module.js';
import { WinstonLogger } from './entities/logging/winston-logger.js';
import { AllExceptionsFilter } from './exceptions/all-exceptions.filter.js';
import { ValidationException } from './exceptions/custom-exceptions/validation-exception.js';
import { Constants } from './helpers/constants/constants.js';
import { publicCrudCorsMiddleware } from './middlewares/public-crud-cors.middleware.js';
import { appConfig } from './shared/config/app-config.js';

async function bootstrap() {
	try {
		appConfig.validate();
		const appOptions: NestApplicationOptions = {
			rawBody: true,
			logger: new WinstonLogger(),
		};

		const app = await NestFactory.create<NestExpressApplication>(ApplicationModule, appOptions);
		app.useLogger(app.get(WinstonLogger));
		app.set('query parser', 'extended');

		Sentry.init({
			dsn: appConfig.thirdParty.sentryDsn ?? undefined,
			tracesSampleRate: 1.0,
		});

		const globalPrefix = appConfig.app.globalPrefix;
		app.setGlobalPrefix(globalPrefix);

		app.useGlobalFilters(new AllExceptionsFilter(app.get(WinstonLogger)));

		app.use(helmet());

		// Wildcard CORS for the public table CRUD routes — registered before the global enableCors()
		// so it owns these routes (including the OPTIONS preflight) before the global allowlist runs.
		app.use(publicCrudCorsMiddleware);

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

process.exit = () => {
	console.trace();
	process.exit = temp;
	process.exit();
};

bootstrap().catch((e) => {
	console.error(`Bootstrap promise failed with error: ${e}`);
	process.exit(1);
});
