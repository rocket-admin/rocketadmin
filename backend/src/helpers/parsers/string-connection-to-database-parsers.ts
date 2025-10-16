import { ConnectionTypesEnum } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/enums/connection-types-enum.js';
import { CreateConnectionDto } from '../../entities/connection/application/dto/create-connection.dto.js';

// postgresql://user:password@localhost:5432/mydatabase?ssh=true&privateSSHKey=key&sshHost=sshHost&sshPort=22&sshUsername=sshUser&ssl=true&cert=cert
export const parseTestPostgresConnectionString = (connectionString: string): Partial<CreateConnectionDto> => {
  const url = new URL(connectionString);
  const config: Partial<CreateConnectionDto> = {};
  config.host = url.hostname || null;
  config.port = parseInt(url.port, 10) || 5432;
  config.username = url.username || null;
  config.password = url.password || null;
  config.database = url.pathname.split('/')[1] || null;
  config.schema = 'public';
  config.type = ConnectionTypesEnum.postgres;
  config.title = 'School of fish';
  config.isTestConnection = true;
  config.ssh = url.searchParams.get('ssh') === 'true';
  config.privateSSHKey = url.searchParams.get('privateSSHKey') || undefined;
  config.sshHost = url.searchParams.get('sshHost') || undefined;
  config.sshPort = parseInt(url.searchParams.get('sshPort'), 10) || undefined;
  config.sshUsername = url.searchParams.get('sshUsername') || undefined;
  config.ssl = url.searchParams.get('ssl') === 'true';
  config.cert = url.searchParams.get('cert') || undefined;
  return config;
};

// mysql://user:password@localhost:3306/mydatabase?ssh=true&privateSSHKey=key&sshHost=sshHost&sshPort=22&sshUsername=sshUser&ssl=true&cert=cert
export const parseTestMySQLConnectionString = (connectionString: string): Partial<CreateConnectionDto> => {
  const url = new URL(connectionString);
  const config: Partial<CreateConnectionDto> = {};
  config.host = url.hostname || null;
  config.port = parseInt(url.port, 10) || 3306;
  config.username = url.username || null;
  config.password = url.password || null;
  config.database = url.pathname.split('/')[1] || null;
  config.type = ConnectionTypesEnum.mysql || null;
  config.title = 'Coworking hub';
  config.isTestConnection = true;
  config.ssh = url.searchParams.get('ssh') === 'true';
  config.privateSSHKey = url.searchParams.get('privateSSHKey') || undefined;
  config.sshHost = url.searchParams.get('sshHost') || undefined;
  config.sshPort = parseInt(url.searchParams.get('sshPort'), 10) || undefined;
  config.sshUsername = url.searchParams.get('sshUsername') || undefined;
  config.ssl = url.searchParams.get('ssl') === 'true';
  config.cert = url.searchParams.get('cert') || undefined;
  return config;
};

// mssql://user:password@localhost:1433/mydatabase?ssh=true&privateSSHKey=key&sshHost=sshHost&sshPort=22&sshUsername=sshUser&ssl=true&cert=cert&azure_encryption=true
export const parseTestMSSQLConnectionString = (connectionString: string): Partial<CreateConnectionDto> => {
  const url = new URL(connectionString);
  const config: Partial<CreateConnectionDto> = {};
  config.host = url.hostname || null;
  config.port = parseInt(url.port, 10) || 1433;
  config.username = url.username || null;
  config.password = url.password || null;
  config.database = url.pathname.split('/')[1] || null;
  config.type = ConnectionTypesEnum.mssql;
  config.title = 'Online shop';
  config.isTestConnection = true;
  config.ssh = url.searchParams.get('ssh') === 'true';
  config.privateSSHKey = url.searchParams.get('privateSSHKey') || undefined;
  config.sshHost = url.searchParams.get('sshHost') || undefined;
  config.sshPort = parseInt(url.searchParams.get('sshPort'), 10) || undefined;
  config.sshUsername = url.searchParams.get('sshUsername') || undefined;
  config.ssl = url.searchParams.get('ssl') === 'true';
  config.cert = url.searchParams.get('cert') || undefined;
  config.schema = url.searchParams.get('schema') || undefined;
  config.azure_encryption = url.searchParams.get('azure_encryption') === 'true';
  return config;
};

// oracle://user:password@localhost:1521/orcl?database=mydatabase&ssh=true&privateSSHKey=key&sshHost=sshHost&sshPort=22&sshUsername=sshUser&ssl=true&cert=cert
export const parseTestOracleDBConnectionString = (connectionString: string): Partial<CreateConnectionDto> => {
  const url = new URL(connectionString);
  const config: Partial<CreateConnectionDto> = {};
  config.host = url.hostname || null;
  config.port = parseInt(url.port, 10) || 1521;
  config.username = url.username || null;
  config.password = url.password || null;
  config.sid = url.pathname.split('/')[1] || null;
  const params = new URLSearchParams(url.search);
  config.database = params.get('database') || undefined;
  config.type = ConnectionTypesEnum.oracledb;
  config.title = 'Online shop';
  config.isTestConnection = true;
  config.schema = params.get('schema') || undefined;
  config.ssh = params.get('ssh') === 'true';
  config.privateSSHKey = params.get('privateSSHKey') || undefined;
  config.sshHost = params.get('sshHost') || undefined;
  config.sshPort = parseInt(params.get('sshPort'), 10) || undefined;
  config.sshUsername = params.get('sshUsername') || undefined;
  config.ssl = params.get('ssl') === 'true';
  config.cert = params.get('cert') || undefined;
  return config;
};

// mongodb://username:password@host:port/mydb?authSource=admin&ssh=true&privateSSHKey=key&sshHost=sshHost&sshPort=22&sshUsername=sshUser&ssl=true&cert=cert
export const parseTestMongoDBConnectionString = (connectionString: string): Partial<CreateConnectionDto> => {
  const url = new URL(connectionString);
  const config: Partial<CreateConnectionDto> = {};
  config.host = url.hostname || null;
  config.port = parseInt(url.port, 10) || 27017;
  config.username = url.username || null;
  config.password = url.password || null;
  config.database = url.pathname.split('/')[1] || null;
  config.type = ConnectionTypesEnum.mongodb;
  config.title = 'Movie theater';
  const authSource = url.searchParams.get('authSource');
  if (authSource) {
    config.authSource = authSource;
  }
  config.isTestConnection = true;
  config.ssh = url.searchParams.get('ssh') === 'true';
  config.privateSSHKey = url.searchParams.get('privateSSHKey') || undefined;
  config.sshHost = url.searchParams.get('sshHost') || undefined;
  config.sshPort = parseInt(url.searchParams.get('sshPort'), 10) || undefined;
  config.sshUsername = url.searchParams.get('sshUsername') || undefined;
  config.ssl = url.searchParams.get('ssl') === 'true';
  config.cert = url.searchParams.get('cert') || undefined;
  return config;
};

// db2://user:password@localhost:50000/mydatabase?schema=myschema&ssh=true&privateSSHKey=key&sshHost=sshHost&sshPort=22&sshUsername=sshUser&ssl=true&cert=cert
export const parseTestIbmDB2ConnectionString = (connectionString: string): Partial<CreateConnectionDto> => {
  const url = new URL(connectionString);
  const config: Partial<CreateConnectionDto> = {};
  config.host = url.hostname || null;
  config.port = parseInt(url.port, 10) || 50000;
  config.username = url.username || null;
  config.password = url.password || null;
  config.database = url.pathname.split('/')[1] || null;
  const params = new URLSearchParams(url.search);
  config.schema = params.get('schema') || undefined;
  config.type = ConnectionTypesEnum.ibmdb2;
  config.title = 'IBM DB2';
  config.isTestConnection = true;
  config.ssh = params.get('ssh') === 'true';
  config.privateSSHKey = params.get('privateSSHKey') || undefined;
  config.sshHost = params.get('sshHost') || undefined;
  config.sshPort = parseInt(params.get('sshPort'), 10) || undefined;
  config.sshUsername = params.get('sshUsername') || undefined;
  config.ssl = params.get('ssl') === 'true';
  config.cert = params.get('cert') || undefined;
  return config;
};

// dynamodb://accessKeyId:secretAccessKey@localhost:8000/
export const parseTestDynamoDBConnectionString = (connectionString: string): Partial<CreateConnectionDto> => {
  const modifiedConnectionString = connectionString.replace('dynamodb://', '');
  const [credentials, nestedUrl] = modifiedConnectionString.split('@');
  const [username, password] = credentials.split(':');
  const url = new URL(nestedUrl);
  const config: Partial<CreateConnectionDto> = {};
  config.username = username || null;
  config.password = password || null;
  const host = `${url.protocol}//${url.hostname}:${url.port}`;
  config.host = host;
  config.type = ConnectionTypesEnum.dynamodb;
  config.title = 'Orders';
  config.isTestConnection = true;
  config.ssl = false;
  return config;
};
