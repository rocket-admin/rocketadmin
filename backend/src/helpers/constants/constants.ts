import { ConnectionTypesEnum } from '@rocketadmin/shared-code/dist/src/shared/enums/connection-types-enum.js';
import { Knex } from 'knex';
import { CreateConnectionDto } from '../../entities/connection/application/dto/create-connection.dto.js';
import { appConfig } from '../../shared/config/app-config.js';
import { isSaaS } from '../app/is-saas.js';
import { isTest } from '../app/is-test.js';
import {
	parseTestDynamoDBConnectionString,
	parseTestMongoDBConnectionString,
	parseTestMSSQLConnectionString,
	parseTestMySQLConnectionString,
	parseTestOracleDBConnectionString,
	parseTestPostgresConnectionString,
} from '../parsers/string-connection-to-database-parsers.js';

export type TestConnectionsFromJSON = {
	//string value represents the connection string, to connect to the database
	'test-mysql': string;
	'test-postgres': string;
	'test-mssql': string;
	'test-oracle': string;
	'test-mongo': string;
	'test-ibmdb2': string;
};

export const Constants = {
	ROCKETADMIN_AUTHENTICATED_COOKIE: 'rocketadmin_authenticated',
	JWT_COOKIE_KEY_NAME: 'rocketadmin_cookie',
	FORBIDDEN_HOSTS: ['10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16', '127.0.0.0/8', 'fd00::/8'],
	BINARY_DATATYPES: [
		'binary',
		'bytea',
		'varbinary',
		'varbinary(max)',
		'tinyblob',
		'blob',
		'mediumblob',
		'longblob',
		'raw',
	],
	DEFAULT_LOG_ROWS_LIMIT: 500,
	MIDNIGHT_CRON_KEY: 1,
	MORNING_CRON_KEY: 2,
	CONNECTION_KEYS_NONE_PERMISSION: ['id', 'title', 'database', 'type', 'connection_properties', 'isTestConnection'],
	FREE_PLAN_USERS_COUNT: 3,
	NON_FREE_PLAN_CONNECTION_TYPES: [ConnectionTypesEnum.ibmdb2, ConnectionTypesEnum.mssql, ConnectionTypesEnum.oracledb],
	MAX_FILE_SIZE_IN_BYTES: 10485760,
	MAX_COMPANY_LOGO_SIZE: 5242880,
	MAX_COMPANY_FAVICON_SIZE: 5242880,
	PAID_CONNECTIONS_TYPES: [ConnectionTypesEnum.oracledb, ConnectionTypesEnum.ibmdb2, ConnectionTypesEnum.mssql],

	VERIFICATION_STRING_WHITELIST: () => {
		const numbers = [...Array(10).keys()].map((num) => num.toString());
		const alpha = Array.from(Array(26)).map((_e, i) => i + 65);
		const letters = alpha.map((x) => String.fromCharCode(x).toLowerCase());
		return [...numbers, ...letters];
	},

	PASSWORD_SALT_LENGTH: 64,
	BYTE_TO_STRING_ENCODING: 'hex' as BufferEncoding,
	PASSWORD_HASH_ITERATIONS: 10000,
	PASSWORD_LENGTH: 256,
	DIGEST: 'sha512',

	CURRENT_TIME_FORMATTED: (): string => {
		const now = new Date();
		const padString = (n: number) => n.toString().padStart(2, '0');
		return `${padString(now.getHours())}:${padString(now.getMinutes())}:${padString(now.getSeconds())}`;
	},

	ONE_WEEK_AGO: (): Date => {
		const today = new Date();
		const oneWeekAgo = today.getDate() - 7;
		today.setDate(oneWeekAgo);
		return today;
	},

	ONE_MONTH_AND_A_WEEK_AGO: (): Date => {
		const today = new Date();
		const oneMonthAgo = today.getMonth() - 1;
		const oneWeekAgo = today.getDate() - 7;
		today.setMonth(oneMonthAgo);
		today.setDate(oneWeekAgo);
		return today;
	},

	TWO_WEEKS_AGO: (): Date => {
		const currentDate = Date.now();
		const twoWeeksInMs = 1209600000;
		const dateTwoWeeksAgoInMs = currentDate - twoWeeksInMs;
		return new Date(dateTwoWeeksAgoInMs);
	},

	ONE_DAY_AGO: (): Date => {
		return new Date(Date.now() - 24 * 60 * 60 * 1000);
	},

	CRON_SHEDULE: '30 5 13 * * *',
	COUNT_QUERY_TIMEOUT_MS: 2000,
	EMAIL_VALIDATION_TIMEOUT: 1000,

	DEFAULT_PAGINATION: { page: 1, perPage: 20 },

	LARGE_DATASET_ROW_LIMIT: 100000,

	DEFAULT_SLACK_CHANNEL: '#errors',
	EXCEPTIONS_CHANNELS: '#errors',
	KEEP_ALIVE_INTERVAL: 30000,
	KEEP_ALIVE_COUNT_MAX: 120,

	DEFAULT_CONNECTION_CACHE_OPTIONS: {
		max: 150,
		ttl: 1000 * 60 * 60,
		updateAgeOnGet: false,
		updateAgeOnHas: false,
		dispose: async (knex: Knex) => {
			await knex.destroy();
		},
	},

	DEFAULT_INVITATION_CACHE_OPTIONS: {
		max: 200,
		ttl: 1000 * 60 * 60,
	},

	DEFAULT_TABLE_PERMISSIONS_CACHE_OPTIONS: {
		max: 1000,
		ttl: 1000 * 10,
	},

	DEFAULT_CEDAR_POLICY_CACHE_OPTIONS: {
		max: 500,
		ttl: 1000 * 60 * 5,
	},

	DEFAULT_FORWARD_IN_HOST: '127.0.0.1',
	AUTOCOMPLETE_ROW_LIMIT: 20,

	FOREIGN_KEY_FIELDS: ['referenced_column_name', 'referenced_table_name', 'constraint_name', 'column_name'],

	TEST_CONNECTION_TO_POSTGRES: {
		title: 'Postgres',
		masterEncryption: false,
		type: ConnectionTypesEnum.postgres,
		username: appConfig.testDb.postgres.username,
		password: appConfig.testDb.postgres.password,
		host: appConfig.testDb.postgres.host,
		port: appConfig.testDb.postgres.port,
		database: appConfig.testDb.postgres.database,
		isTestConnection: true,
	},

	TEST_CONNECTION_TO_MSSQL: {
		title: 'MSSQL',
		masterEncryption: false,
		type: ConnectionTypesEnum.mssql,
		host: appConfig.testDb.mssql.host,
		port: appConfig.testDb.mssql.port,
		password: appConfig.testDb.mssql.password,
		username: appConfig.testDb.mssql.username,
		database: appConfig.testDb.mssql.database,
		ssh: false,
		ssl: false,
		isTestConnection: true,
	},

	TEST_CONNECTION_TO_ORACLE: {
		title: 'Oracle',
		type: ConnectionTypesEnum.oracledb,
		host: appConfig.testDb.oracle.host,
		port: appConfig.testDb.oracle.port,
		username: appConfig.testDb.oracle.username,
		password: appConfig.testDb.oracle.password,
		database: appConfig.testDb.oracle.database,
		sid: appConfig.testDb.oracle.sid,
		isTestConnection: true,
	},

	TEST_SSH_CONNECTION_TO_MYSQL: {
		title: 'MySQL',
		type: ConnectionTypesEnum.mysql,
		host: appConfig.testDb.mysql.host,
		port: appConfig.testDb.mysql.port,
		username: appConfig.testDb.mysql.username,
		password: appConfig.testDb.mysql.password,
		database: appConfig.testDb.mysql.database,
		ssh: true,
		isTestConnection: true,
		sshHost: appConfig.testDb.mysql.sshHost,
		sshPort: appConfig.testDb.mysql.sshPort,
		sshUsername: appConfig.testDb.mysql.sshUsername,
		privateSSHKey: appConfig.testDb.mysql.sshKey,
	},

	TEST_CONNECTION_TO_MONGO: {
		title: 'MongoDB',
		type: ConnectionTypesEnum.mongodb,
		host: appConfig.testDb.mongo.host,
		port: appConfig.testDb.mongo.port,
		username: appConfig.testDb.mongo.username,
		password: appConfig.testDb.mongo.password,
		database: appConfig.testDb.mongo.database,
		authSource: appConfig.testDb.mongo.authSource,
		isTestConnection: true,
	},

	TEST_CONNECTION_TO_IBMBD2: {
		title: 'IBM DB2',
		type: ConnectionTypesEnum.ibmdb2,
		host: appConfig.testDb.ibmdb2.host,
		port: appConfig.testDb.ibmdb2.port,
		username: appConfig.testDb.ibmdb2.username,
		password: appConfig.testDb.ibmdb2.password,
		database: appConfig.testDb.ibmdb2.database,
		schema: appConfig.testDb.ibmdb2.schema,
		isTestConnection: true,
	},

	REMOVED_PASSWORD_VALUE: '***',
	REMOVED_SENSITIVE_FIELD_IF_CHANGED: '* * * sensitive data, no logs stored * * *',
	REMOVED_SENSITIVE_FIELD_IF_NOT_CHANGED: '',

	getTestConnectionsArr: (): Array<CreateConnectionDto> => {
		if (!isSaaS()) {
			return [];
		}

		const testConnections: Array<CreateConnectionDto | null> = Constants.getTestConnectionsFromDSN() || [];
		if (!testConnections.length) {
			testConnections.push(
				Constants.TEST_CONNECTION_TO_ORACLE as CreateConnectionDto,
				Constants.TEST_CONNECTION_TO_POSTGRES as CreateConnectionDto,
				Constants.TEST_SSH_CONNECTION_TO_MYSQL as unknown as CreateConnectionDto,
				Constants.TEST_CONNECTION_TO_MSSQL as CreateConnectionDto,
				Constants.TEST_CONNECTION_TO_MONGO as CreateConnectionDto,
				Constants.TEST_CONNECTION_TO_IBMBD2 as CreateConnectionDto,
			);
		}

		return testConnections.filter((dto): dto is CreateConnectionDto => {
			if (!dto) {
				return false;
			}
			const values = Object.values(dto);
			const nullElementIndex = values.indexOf(null);
			return nullElementIndex < 0;
		});
	},

	getTestConnectionsFromDSN: (): Array<CreateConnectionDto | null> | null => {
		if (!isSaaS()) {
			return [];
		}
		const testConnectionsJSON = appConfig.testDb.testConnectionsJson;
		if (!testConnectionsJSON) {
			return null;
		}
		try {
			const testConnectionsDSNFromJSON: TestConnectionsFromJSON = JSON.parse(testConnectionsJSON);
			const testConnectionsArr: Array<CreateConnectionDto | null> = [];
			for (const [connection_type, connection_string] of Object.entries(testConnectionsDSNFromJSON)) {
				let connection: CreateConnectionDto | null = null;
				const type = connection_type.toLowerCase();
				switch (true) {
					case type.toLowerCase().includes('mysql'):
						connection = parseTestMySQLConnectionString(connection_string) as CreateConnectionDto;
						break;
					case type.toLowerCase().includes('postgres'):
						connection = parseTestPostgresConnectionString(connection_string) as CreateConnectionDto;
						break;
					case type.toLowerCase().includes('mssql'):
						connection = parseTestMSSQLConnectionString(connection_string) as CreateConnectionDto;
						break;
					case type.toLowerCase().includes('oracle'):
						connection = parseTestOracleDBConnectionString(connection_string) as CreateConnectionDto;
						break;
					case type.toLowerCase().includes('mongo'):
						connection = parseTestMongoDBConnectionString(connection_string) as CreateConnectionDto;
						break;
					case type.toLowerCase().includes('dynamodb'):
						connection = parseTestDynamoDBConnectionString(connection_string) as CreateConnectionDto;
						break;
					default:
						break;
				}
				if (connection) {
					testConnectionsArr.push(connection);
				}
			}
			return testConnectionsArr;
		} catch (e) {
			console.error('Error parsing test connections from DSN: ' + e);
			return null;
		}
	},

	getTestConnectionsHostNamesArr: function (): Array<string> {
		return this.getTestConnectionsArr().map((connection: { host: string }) => connection.host);
	},

	APP_DOMAIN_ADDRESS: appConfig.app.domainAddress,
	ALLOWED_REQUEST_DOMAIN: (): string => {
		if (isTest()) {
			return Constants.APP_DOMAIN_ADDRESS;
		}
		return `app.rocketadmin.com`;
	},

	APP_REQUEST_DOMAINS(): Array<string> {
		const allowedDomains = ['app.rocketadmin.com', 'saas.rocketadmin.com', Constants.APP_DOMAIN_ADDRESS];
		if (isTest()) {
			allowedDomains.push('127.0.0.1', Constants.APP_DOMAIN_ADDRESS);
		}
		return allowedDomains;
	},

	AUTOADMIN_SUPPORT_MAIL: 'support@autoadmin.org',
};
