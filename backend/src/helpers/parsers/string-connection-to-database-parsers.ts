import { ConnectionTypesEnum } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/enums/connection-types-enum.js';
import { CreateConnectionDto } from '../../entities/connection/application/dto/create-connection.dto.js';

// postgresql://user:password@localhost:5432/mydatabase
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
  config.title = 'PostgreSQL';
  return config;
};

// mysql://user:password@localhost:3306/mydatabase
export const parseTestMySQLConnectionString = (connectionString: string): Partial<CreateConnectionDto> => {
  const url = new URL(connectionString);
  const config: Partial<CreateConnectionDto> = {};
  config.host = url.hostname || null;
  config.port = parseInt(url.port, 10) || 3306;
  config.username = url.username || null;
  config.password = url.password || null;
  config.database = url.pathname.split('/')[1] || null;
  config.type = ConnectionTypesEnum.mysql || null;
  config.title = 'MySQL';
  config.isTestConnection = true;
  return config;
};

// mssql://user:password@localhost:1433/mydatabase
export const parseTestMSSQLConnectionString = (connectionString: string): Partial<CreateConnectionDto> => {
  const url = new URL(connectionString);
  const config: Partial<CreateConnectionDto> = {};

  config.host = url.hostname || null;
  config.port = parseInt(url.port, 10) || 1433;
  config.username = url.username || null;
  config.password = url.password || null;
  config.database = url.pathname.split('/')[1] || null;
  config.type = ConnectionTypesEnum.mssql;
  config.title = 'MSSQL';
  config.isTestConnection = true;
  return config;
};

// oracle://user:password@localhost:1521/orcl?database=mydatabase
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
  config.title = 'Oracle DB';
  config.isTestConnection = true;
  return config;
};

// mongodb://username:password@host:port/mydb?authSource=admin
export const parseTestMongoDBConnectionString = (connectionString: string): Partial<CreateConnectionDto> => {
  const url = new URL(connectionString);
  const config: Partial<CreateConnectionDto> = {};

  config.host = url.hostname || null;
  config.port = parseInt(url.port, 10) || 27017;
  config.username = url.username || null;
  config.password = url.password || null;
  config.database = url.pathname.split('/')[1] || null;
  config.type = ConnectionTypesEnum.mongodb;
  config.title = 'MongoDB';
  const authSource = url.searchParams.get('authSource');
  if (authSource) {
    config.authSource = authSource;
  }
  config.isTestConnection = true;
  return config;
};

// db2://user:password@localhost:50000/mydatabase?schema=myschema
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

  return config;
};
