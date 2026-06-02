import { uuid_ossp } from '@electric-sql/pglite/contrib/uuid_ossp';
import dotenv from 'dotenv';
import fs from 'fs';
import path, { join } from 'path';
import parse from 'pg-connection-string';
import { DataSourceOptions } from 'typeorm';
import { PGliteDriver } from 'typeorm-pglite';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface AuthConfig {
	privateKey: string | null;
	jwtSecret: string | null;
	temporaryJwtSecret: string | null;
	microserviceJwtSecret: string | null;
	basicAuthLogin: string | null;
	basicAuthPassword: string | null;
}

export interface AppSectionConfig {
	port: number;
	globalPrefix: string;
	logLevel: string;
	domainAddress: string;
	cookieDomain: string | null;
}

export interface DbConfig {
	databaseUrl: string | null;
	pgliteFolderPath: string | null;
}

export interface EmailConfig {
	configString: string | null;
	host: string | null;
	port: number;
	username: string | null;
	password: string | null;
	nonSecure: boolean;
	from: string;
}

export interface ThirdPartyConfig {
	sentryDsn: string | null;
	intercomKey: string | null;
	amplitudeApiKey: string | null;
	slackBotAccessToken: string | null;
	turnstileSecretKey: string | null;
	saasUrl: string;
}

export interface TestDbConfig {
	testConnectionsJson: string | null;
	postgres: {
		host: string | null;
		port: number | null;
		username: string | null;
		password: string | null;
		database: string | null;
	};
	mssql: {
		host: string | null;
		port: number | null;
		username: string | null;
		password: string | null;
		database: string | null;
	};
	oracle: {
		host: string | null;
		port: number | null;
		username: string | null;
		password: string | null;
		database: string | null;
		sid: string | null;
	};
	mysql: {
		host: string | null;
		port: number | null;
		username: string | null;
		password: string | null;
		database: string | null;
		sshHost: string | null;
		sshPort: string | null;
		sshUsername: string | null;
		sshKey: string | null;
	};
	mongo: {
		host: string | null;
		port: number | null;
		username: string | null;
		password: string | null;
		database: string | null;
		authSource: string | null;
	};
	ibmdb2: {
		host: string | null;
		port: number | null;
		username: string | null;
		password: string | null;
		database: string | null;
		schema: string | null;
	};
}

const AUTOADMIN_SUPPORT_MAIL = 'support@autoadmin.org';
const DEFAULT_APP_DOMAIN_ADDRESS = 'http://127.0.0.1:3000';
const DEFAULT_SAAS_URL = 'http://rocketadmin-private-microservice:3001';
const DEFAULT_LOG_LEVEL = 'info';
const DEFAULT_GLOBAL_PREFIX = '/';
const DEFAULT_EMAIL_PORT = 25;
const DEFAULT_PORT = 3000;

function readString(key: string): string | null {
	// eslint-disable-next-line security/detect-object-injection
	const value = process.env[key];
	return value && value.length > 0 ? value : null;
}

function readInt(key: string): number | null {
	const raw = readString(key);
	if (raw === null) return null;
	const parsed = parseInt(raw, 10);
	return Number.isFinite(parsed) ? parsed : null;
}

export class AppConfig {
	public readonly auth: AuthConfig;
	public readonly app: AppSectionConfig;
	public readonly db: DbConfig;
	public readonly email: EmailConfig;
	public readonly thirdParty: ThirdPartyConfig;
	public readonly testDb: TestDbConfig;

	constructor() {
		this.auth = Object.freeze({
			privateKey: readString('PRIVATE_KEY'),
			jwtSecret: readString('JWT_SECRET'),
			temporaryJwtSecret: readString('TEMPORARY_JWT_SECRET'),
			microserviceJwtSecret: readString('MICROSERVICE_JWT_SECRET'),
			basicAuthLogin: readString('BASIC_AUTH_LOGIN'),
			basicAuthPassword: readString('BASIC_AUTH_PWD'),
		});

		this.app = Object.freeze({
			port: readInt('PORT') ?? DEFAULT_PORT,
			globalPrefix: readString('GLOBAL_PREFIX') ?? DEFAULT_GLOBAL_PREFIX,
			logLevel: readString('LOG_LEVEL') ?? DEFAULT_LOG_LEVEL,
			domainAddress: readString('APP_DOMAIN_ADDRESS') ?? DEFAULT_APP_DOMAIN_ADDRESS,
			cookieDomain: readString('ROCKETADMIN_COOKIE_DOMAIN'),
		});

		this.db = Object.freeze({
			databaseUrl: readString('DATABASE_URL'),
			pgliteFolderPath: readString('PGLITE_FOLDER_PATH'),
		});

		this.email = Object.freeze({
			configString: readString('EMAIL_CONFIG_STRING'),
			host: readString('EMAIL_SERVICE_HOST'),
			port: readInt('EMAIL_SERVICE_PORT') ?? DEFAULT_EMAIL_PORT,
			username: readString('EMAIL_SERVICE_USERNAME'),
			password: readString('EMAIL_SERVICE_PASSWORD'),
			nonSecure: readString('NON_SSL_EMAIL') === null,
			from: readString('EMAIL_FROM') ?? AUTOADMIN_SUPPORT_MAIL,
		});

		this.thirdParty = Object.freeze({
			sentryDsn: readString('SENTRY_DSN'),
			intercomKey: readString('INTERCOM_KEY'),
			amplitudeApiKey: readString('AMPLITUDE_API_KEY'),
			slackBotAccessToken: readString('SLACK_BOT_ACCESS_TOKEN'),
			turnstileSecretKey: readString('TURNSTILE_SECRET_KEY'),
			saasUrl: readString('SAAS_URL') ?? DEFAULT_SAAS_URL,
		});

		this.testDb = Object.freeze({
			testConnectionsJson: readString('TEST_CONNECTIONS'),
			postgres: Object.freeze({
				host: readString('POSTGRES_CONNECTION_HOST'),
				port: readInt('POSTGRES_CONNECTION_PORT'),
				username: readString('POSTGRES_CONNECTION_USERNAME'),
				password: readString('POSTGRES_CONNECTION_PASSWORD'),
				database: readString('POSTGRES_CONNECTION_DATABASE'),
			}),
			mssql: Object.freeze({
				host: readString('MSSQL_CONNECTION_HOST'),
				port: readInt('MSSQL_CONNECTION_PORT'),
				username: readString('MSSQL_CONNECTION_USERNAME'),
				password: readString('MSSQL_CONNECTION_PASSWORD'),
				database: readString('MSSQL_CONNECTION_DATABASE'),
			}),
			oracle: Object.freeze({
				host: readString('ORACLE_CONNECTION_HOST'),
				port: readInt('ORACLE_CONNECTION_PORT'),
				username: readString('ORACLE_CONNECTION_USERNAME'),
				password: readString('ORACLE_CONNECTION_PASSWORD'),
				database: readString('ORACLE_CONNECTION_DATABASE'),
				sid: readString('ORACLE_CONNECTION_SID'),
			}),
			mysql: Object.freeze({
				host: readString('MYSQL_CONNECTION_HOST'),
				port: readInt('MYSQL_CONNECTION_PORT'),
				username: readString('MYSQL_CONNECTION_USERNAME'),
				password: readString('MYSQL_CONNECTION_PASSWORD'),
				database: readString('MYSQL_CONNECTION_DATABASE'),
				sshHost: readString('MYSQL_CONNECTION_SSH_HOST'),
				sshPort: readString('MYSQL_CONNECTION_SSH_PORT'),
				sshUsername: readString('MYSQL_CONNECTION_SSH_USERNAME'),
				sshKey: readString('MYSQL_CONNECTION_SSH_KEY'),
			}),
			mongo: Object.freeze({
				host: readString('MONGO_CONNECTION_HOST'),
				port: readInt('MONGO_CONNECTION_PORT'),
				username: readString('MONGO_CONNECTION_USERNAME'),
				password: readString('MONGO_CONNECTION_PASSWORD'),
				database: readString('MONGO_CONNECTION_DATABASE'),
				authSource: readString('MONGO_CONNECTION_AUTH_SOURCE'),
			}),
			ibmdb2: Object.freeze({
				host: readString('IBM_DB2_CONNECTION_HOST'),
				port: readInt('IBM_DB2_CONNECTION_PORT'),
				username: readString('IBM_DB2_CONNECTION_USERNAME'),
				password: readString('IBM_DB2_CONNECTION_PASSWORD'),
				database: readString('IBM_DB2_CONNECTION_DATABASE'),
				schema: readString('IBM_DB2_CONNECTION_SCHEMA'),
			}),
		});

		Object.freeze(this);
	}

	public get isTest(): boolean {
		return process.env.NODE_ENV === 'test';
	}

	public get isSaaS(): boolean {
		return !!process.env.IS_SAAS;
	}

	public validate(): void {
		if (this.isTest) {
			console.info('Running test environment');
			return;
		}

		const missing: Array<string> = [];
		if (!this.auth.privateKey) missing.push('PRIVATE_KEY');
		if (!this.auth.jwtSecret) missing.push('JWT_SECRET');
		if (!this.db.pgliteFolderPath && !this.db.databaseUrl) missing.push('DATABASE_URL');

		if (missing.length > 0) {
			const plural = missing.length > 1;
			throw new Error(`Required parameter${plural ? 's' : ''} ${missing.join(', ')} ${plural ? 'are' : 'is'} missing`);
		}
	}

	public getTypeOrmConfig(): DataSourceOptions {
		let pgLiteDriver = null;
		let connectionParams = {};

		const pgLiteFolderPath = this.db.pgliteFolderPath;
		if (pgLiteFolderPath && pgLiteFolderPath.length > 0) {
			const fullPath = this.isTest
				? path.join(process.cwd(), ...pgLiteFolderPath.split('/'))
				: path.join(__dirname, '..', '..', '..', pgLiteFolderPath);
			console.info('\nPg Lite Folder Patch: ', pgLiteFolderPath, '\n');
			const resolvedPath = path.resolve(fullPath);
			try {
				fs.accessSync(resolvedPath, fs.constants.F_OK);
				console.log('PGLite directory exists');
				try {
					fs.accessSync(resolvedPath, fs.constants.W_OK);
					console.log('PGLite directory is writable');
				} catch (writeError) {
					console.warn('PGLite directory exists but may not be writable:', (writeError as Error).message);
				}
			} catch (error) {
				console.log('PGLite directory does not exist, will be created by PGLite', error);
			}

			pgLiteDriver = new PGliteDriver({
				extensions: { uuid_ossp },
				dataDir: path.resolve(resolvedPath),
			}).driver;
		} else {
			if (!this.db.databaseUrl) {
				throw new Error('DATABASE_URL is required when PGLITE_FOLDER_PATH is not set');
			}
			connectionParams = this.parseTypeORMUrl(this.db.databaseUrl);
		}

		const baseConfig: DataSourceOptions = {
			type: 'postgres',
			...connectionParams,
			entities: [join(__dirname, '..', '..', '**', '*.entity.{ts,js}')],
			migrations: [join(__dirname, '..', '..', 'migrations', '*.{ts,js}')],
			synchronize: false,
			migrationsRun: false,
			driver: pgLiteDriver ? pgLiteDriver : undefined,
		};

		if (this.isTest) {
			return {
				...baseConfig,
				logging: false,
				logger: 'advanced-console',
				extra: { max: 10 },
			};
		}

		return {
			...baseConfig,
			extra: {
				max: 20,
				idle_in_transaction_session_timeout: 20 * 1000,
			},
		};
	}

	private parseTypeORMUrl(url: string): {
		host: string | undefined;
		port: number;
		username: string | undefined;
		password: string | undefined;
		database: string | undefined;
		ssl: any;
	} {
		const parsingResult = parse.parse(url);
		const { host, port, user, password, database, ssl } = parsingResult;
		return {
			host: host ?? undefined,
			port: parseInt(port ?? '', 10),
			username: user ?? undefined,
			password: password ?? undefined,
			database: database ?? undefined,
			ssl,
		};
	}
}

export const appConfig = new AppConfig();
