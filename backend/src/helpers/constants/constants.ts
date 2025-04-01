import { ConnectionTypesEnum } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/enums/connection-types-enum.js';
import { CreateConnectionDto } from '../../entities/connection/application/dto/create-connection.dto.js';
import { Knex } from 'knex';
import { getProcessVariable } from '../get-process-variable.js';
import { isSaaS } from '../app/is-saas.js';
import {
  parseTestMySQLConnectionString,
  parseTestPostgresConnectionString,
  parseTestMSSQLConnectionString,
  parseTestOracleDBConnectionString,
  parseTestMongoDBConnectionString,
  parseTestIbmDB2ConnectionString,
  parseTestDynamoDBConnectionString,
} from '../parsers/string-connection-to-database-parsers.js';
import { isTest } from '../app/is-test.js';

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
  BINARY_DATATYPES: ['binary', 'bytea', 'varbinary', 'varbinary(max)', 'tinyblob', 'blob', 'mediumblob', 'longblob'],
  DEFAULT_LOG_ROWS_LIMIT: 500,
  MIDNIGHT_CRON_KEY: 1,
  MORNING_CRON_KEY: 2,
  CONNECTION_KEYS_NONE_PERMISSION: ['id', 'title', 'database', 'type', 'connection_properties', 'isTestConnection'],
  FREE_PLAN_USERS_COUNT: 3,
  NON_FREE_PLAN_CONNECTION_TYPES: [ConnectionTypesEnum.ibmdb2, ConnectionTypesEnum.mssql, ConnectionTypesEnum.oracledb],
  MAX_FILE_SIZE_IN_BYTES: 10485760,
  MAX_COMPANY_LOGO_SIZE: 5242880,
  PAID_CONNECTIONS_TYPES: [ConnectionTypesEnum.oracledb, ConnectionTypesEnum.ibmdb2, ConnectionTypesEnum.mssql],

  VERIFICATION_STRING_WHITELIST: () => {
    const numbers = [...Array(10).keys()].map((num) => num.toString());
    const alpha = Array.from(Array(26)).map((e, i) => i + 65);
    const letters = alpha.map((x) => String.fromCharCode(x).toLowerCase());
    return [...numbers, ...letters];
  },

  PASSWORD_SALT_LENGTH: 64,
  BYTE_TO_STRING_ENCODING: 'hex' as BufferEncoding,
  PASSWORD_HASH_ITERATIONS: 10000,
  PASSWORD_LENGTH: 256,
  DIGEST: 'sha512',

  ONE_WEEK_AGO: (): Date => {
    const today = new Date();
    const oneWeekAgo = today.getDate() - 7;
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
    return new Date(new Date().getTime() - 24 * 60 * 60 * 1000);
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

  DEFAULT_TUNNEL_CACHE_OPTIONS: {
    max: 100,
    ttl: 1000 * 60 * 60,
    dispose: async (tnl: any) => {
      try {
        await tnl.close();
      } catch (e) {
        console.error('Tunnel closing error: ' + e);
      }
    },
  },

  DEFAULT_DRIVER_CACHE_OPTIONS: {
    max: 50,
    ttl: 1000 * 60 * 60,
  },

  DEFAULT_INVITATION_CACHE_OPTIONS: {
    max: 200,
    ttl: 1000 * 60 * 60,
  },

  DEFAULT_TABLE_STRUCTURE_ELEMENTS_CACHE_OPTIONS: {
    max: 1000,
    ttl: 1000 * 60,
  },

  DEFAULT_TABLE_PERMISSIONS_CACHE_OPTIONS: {
    max: 1000,
    ttl: 1000 * 10,
  },

  DEFAULT_FORWARD_IN_HOST: '127.0.0.1',
  AUTOCOMPLETE_ROW_LIMIT: 20,

  FOREIGN_KEY_FIELDS: ['referenced_column_name', 'referenced_table_name', 'constraint_name', 'column_name'],

  TEST_CONNECTION_TO_POSTGRES: {
    title: 'Postgres',
    masterEncryption: false,
    type: ConnectionTypesEnum.postgres,
    username: getProcessVariable('POSTGRES_CONNECTION_USERNAME') || null,
    password: getProcessVariable('POSTGRES_CONNECTION_PASSWORD') || null,
    host: getProcessVariable('POSTGRES_CONNECTION_HOST') || null,
    port: parseInt(getProcessVariable('POSTGRES_CONNECTION_PORT')) || null,
    database: getProcessVariable('POSTGRES_CONNECTION_DATABASE') || null,
    isTestConnection: true,
  },

  TEST_CONNECTION_TO_MSSQL: {
    title: 'MSSQL',
    masterEncryption: false,
    type: ConnectionTypesEnum.mssql,
    host: getProcessVariable('MSSQL_CONNECTION_HOST') || null,
    port: parseInt(getProcessVariable('MSSQL_CONNECTION_PORT')) || null,
    password: getProcessVariable('MSSQL_CONNECTION_PASSWORD') || null,
    username: getProcessVariable('MSSQL_CONNECTION_USERNAME') || null,
    database: getProcessVariable('MSSQL_CONNECTION_DATABASE') || null,
    ssh: false,
    ssl: false,
    isTestConnection: true,
  },

  TEST_CONNECTION_TO_ORACLE: {
    title: 'Oracle',
    type: ConnectionTypesEnum.oracledb,
    host: getProcessVariable('ORACLE_CONNECTION_HOST') || null,
    port: parseInt(getProcessVariable('ORACLE_CONNECTION_PORT')) || null,
    username: getProcessVariable('ORACLE_CONNECTION_USERNAME') || null,
    password: getProcessVariable('ORACLE_CONNECTION_PASSWORD') || null,
    database: getProcessVariable('ORACLE_CONNECTION_DATABASE') || null,
    sid: getProcessVariable('ORACLE_CONNECTION_SID') || null,
    isTestConnection: true,
  },

  TEST_SSH_CONNECTION_TO_MYSQL: {
    title: 'MySQL',
    type: ConnectionTypesEnum.mysql,
    host: getProcessVariable('MYSQL_CONNECTION_HOST') || null,
    port: parseInt(getProcessVariable('MYSQL_CONNECTION_PORT')) || null,
    username: getProcessVariable('MYSQL_CONNECTION_USERNAME') || null,
    password: getProcessVariable('MYSQL_CONNECTION_PASSWORD') || null,
    database: getProcessVariable('MYSQL_CONNECTION_DATABASE') || null,
    ssh: true,
    isTestConnection: true,
    sshHost: getProcessVariable('MYSQL_CONNECTION_SSH_HOST') || null,
    sshPort: getProcessVariable('MYSQL_CONNECTION_SSH_PORT') || null,
    sshUsername: getProcessVariable('MYSQL_CONNECTION_SSH_USERNAME') || null,
    privateSSHKey: getProcessVariable('MYSQL_CONNECTION_SSH_KEY') || null,
  },

  TEST_CONNECTION_TO_MONGO: {
    title: 'MongoDB',
    type: ConnectionTypesEnum.mongodb,
    host: getProcessVariable('MONGO_CONNECTION_HOST') || null,
    port: parseInt(getProcessVariable('MONGO_CONNECTION_PORT')) || null,
    username: getProcessVariable('MONGO_CONNECTION_USERNAME') || null,
    password: getProcessVariable('MONGO_CONNECTION_PASSWORD') || null,
    database: getProcessVariable('MONGO_CONNECTION_DATABASE') || null,
    authSource: getProcessVariable('MONGO_CONNECTION_AUTH_SOURCE') || null,
    isTestConnection: true,
  },

  TEST_CONNECTION_TO_IBMBD2: {
    title: 'IBM DB2',
    type: ConnectionTypesEnum.ibmdb2,
    host: getProcessVariable('IBM_DB2_CONNECTION_HOST') || null,
    port: parseInt(getProcessVariable('IBM_DB2_CONNECTION_PORT')) || null,
    username: getProcessVariable('IBM_DB2_CONNECTION_USERNAME') || null,
    password: getProcessVariable('IBM_DB2_CONNECTION_PASSWORD') || null,
    database: getProcessVariable('IBM_DB2_CONNECTION_DATABASE') || null,
    schema: getProcessVariable('IBM_DB2_CONNECTION_SCHEMA') || null,
    isTestConnection: true,
  },

  REMOVED_PASSWORD_VALUE: '***',
  REMOVED_SENSITIVE_FIELD_IF_CHANGED: '* * * sensitive data, no logs stored * * *',
  REMOVED_SENSITIVE_FIELD_IF_NOT_CHANGED: '',

  getTestConnectionsArr: function (): Array<CreateConnectionDto> {
    const isSaaS = process.env.IS_SAAS;
    if (!isSaaS || isSaaS !== 'true') {
      return [];
    }
    const testConnections: Array<CreateConnectionDto> = Constants.getTestConnectionsFromDSN() || [];
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

    return testConnections.filter((dto) => {
      const values = Object.values(dto);
      const nullElementIndex = values.findIndex((el) => el === null);
      return nullElementIndex < 0;
    });
  },

  getTestConnectionsFromDSN: function (): Array<CreateConnectionDto | null> {
    if (!isSaaS()) {
      return [];
    }
    const testConnectionsJSON = getProcessVariable('TEST_CONNECTIONS');
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
          case type.toLowerCase().includes('ibmdb2'):
            connection = parseTestIbmDB2ConnectionString(connection_string) as CreateConnectionDto;
            break;
          case type.toLowerCase().includes('dynamodb'):
            connection = parseTestDynamoDBConnectionString(connection_string) as CreateConnectionDto;
          default:
            break;
        }
        testConnectionsArr.push(connection);
      }
      return testConnectionsArr;
    } catch (e) {
      console.error('Error parsing test connections from DSN: ' + e);
      return null;
    }
  },

  getTestConnectionsHostNamesArr: function (): Array<string> {
    return this.getTestConnectionsArr().map((connection) => connection.host);
  },

  APP_DOMAIN_ADDRESS: process.env.APP_DOMAIN_ADDRESS || `http://127.0.0.1:3000`,
  ALLOWED_REQUEST_DOMAIN: function (): string {
    if (isTest()) {
      return Constants.APP_DOMAIN_ADDRESS;
    }
    return `app.rocketadmin.com`;
  },

  APP_REQUEST_DOMAINS(): Array<string> {
    const allowedDomains = ['app.rocketadmin.com', 'saas.rocketadmin.com'];
    if (isTest()) {
      allowedDomains.push('127.0.0.1', Constants.APP_DOMAIN_ADDRESS);
    }
    return allowedDomains;
  },

  AUTOADMIN_SUPPORT_MAIL: 'support@autoadmin.org',
};
