import { ERROR_MESSAGES } from '../../helpers/errors/error-messages.js';
import { DataAccessObjectAgent } from '../data-access-objects/data-access-object-agent.js';
import { DataAccessObjectDynamoDB } from '../data-access-objects/data-access-object-dynamodb.js';
import { DataAccessObjectElasticsearch } from '../data-access-objects/data-access-object-elasticsearch.js';
import { DataAccessObjectIbmDb2 } from '../data-access-objects/data-access-object-ibmdb2.js';
import { DataAccessObjectMongo } from '../data-access-objects/data-access-object-mongodb.js';
import { DataAccessObjectMssql } from '../data-access-objects/data-access-object-mssql.js';
import { DataAccessObjectMysql } from '../data-access-objects/data-access-object-mysql.js';
import { DataAccessObjectOracle } from '../data-access-objects/data-access-object-oracle.js';
import { DataAccessObjectPostgres } from '../data-access-objects/data-access-object-postgres.js';
import { ConnectionAgentParams, ConnectionParams } from './data-structures/connections-params.ds.js';
import { ConnectionTypesEnum } from './enums/connection-types-enum.js';
import { IDataAccessObjectAgent } from './interfaces/data-access-object-agent.interface.js';
import { IDataAccessObject } from './interfaces/data-access-object.interface.js';

interface IUnknownConnectionParams {
  [key: string]: any;
}
export function getDataAccessObject(
  connectionParams: IUnknownConnectionParams,
): IDataAccessObject | IDataAccessObjectAgent {
  const agentTypes = [
    ConnectionTypesEnum.agent_mssql,
    ConnectionTypesEnum.agent_mysql,
    ConnectionTypesEnum.agent_oracledb,
    ConnectionTypesEnum.agent_postgres,
    ConnectionTypesEnum.agent_ibmdb2,
    ConnectionTypesEnum.agent_mongodb,
  ];
  if (!connectionParams || connectionParams === null) {
    throw new Error(ERROR_MESSAGES.CONNECTION_PARAMS_SHOULD_BE_DEFINED);
  }
  if (!connectionParams.type) {
    throw new Error(ERROR_MESSAGES.PROPERTY_TYPE_REQUIRED);
  }
  switch (connectionParams.type) {
    case ConnectionTypesEnum.postgres:
      const connectionParamsPostgres = buildConnectionParams(connectionParams);
      return new DataAccessObjectPostgres(connectionParamsPostgres);
    case ConnectionTypesEnum.mysql:
      const connectionParamsMysql = buildConnectionParams(connectionParams);
      return new DataAccessObjectMysql(connectionParamsMysql);
    case ConnectionTypesEnum.mssql:
      const connectionParamsMssql = buildConnectionParams(connectionParams);
      return new DataAccessObjectMssql(connectionParamsMssql);
    case ConnectionTypesEnum.oracledb:
      const connectionParamsOracle = buildConnectionParams(connectionParams);
      return new DataAccessObjectOracle(connectionParamsOracle);
    case ConnectionTypesEnum.ibmdb2:
      const connectionParamsToIbmDB2 = buildConnectionParams(connectionParams);
      return new DataAccessObjectIbmDb2(connectionParamsToIbmDB2);
    case ConnectionTypesEnum.mongodb:
      const connectionParamsMongo = buildConnectionParams(connectionParams);
      return new DataAccessObjectMongo(connectionParamsMongo);
    case ConnectionTypesEnum.dynamodb:
      const connectionParamsDynamoDB = buildConnectionParams(connectionParams);
      return new DataAccessObjectDynamoDB(connectionParamsDynamoDB);
    case ConnectionTypesEnum.elasticsearch:
      const connectionParamsElasticsearch = buildConnectionParams(connectionParams);
      return new DataAccessObjectElasticsearch(connectionParamsElasticsearch);
    default:
      if (!agentTypes.includes(connectionParams.type)) {
        throw new Error(ERROR_MESSAGES.CONNECTION_TYPE_INVALID);
      }
      const connectionParamsAgent = buildAgentConnectionParams(connectionParams);
      return new DataAccessObjectAgent(connectionParamsAgent);
  }
}

function buildAgentConnectionParams(connectionParams: IUnknownConnectionParams): ConnectionAgentParams {
  if (!connectionParams.agent || !connectionParams.agent.token) {
    throw new Error(ERROR_MESSAGES.AGENT_SHOULD_BE_DEFINED);
  }
  return {
    id: connectionParams.id || null,
    title: connectionParams.title || null,
    signing_key: connectionParams.signing_key,
    token: connectionParams.agent.token,
    type: connectionParams.type,
    isTestConnection: false,
  };
}

function buildConnectionParams(connectionParams: IUnknownConnectionParams): ConnectionParams {
  const requiredKeys =
    connectionParams.type !== ConnectionTypesEnum.dynamodb &&
    connectionParams.type !== ConnectionTypesEnum.elasticsearch
      ? ['type', 'host', 'port', 'username', 'password', 'database']
      : ['host', 'username', 'password'];

  if (connectionParams.ssh) {
    requiredKeys.push('sshHost', 'sshPort', 'sshUsername');
  }

  // eslint-disable-next-line security/detect-object-injection
  const missingKeys = requiredKeys.filter((key) => !connectionParams[key]);
  if (missingKeys.length > 0) {
    throw new Error(`Missing required key${missingKeys.length > 1 ? 's' : ''}: ${missingKeys.join(', ')}`);
  }
  const connection = {
    id: connectionParams.id,
    title: connectionParams.title,
    type: connectionParams.type === ConnectionTypesEnum.mysql ? 'mysql2' : connectionParams.type,
    host: connectionParams.host,
    port: connectionParams.port,
    username: connectionParams.username,
    password: connectionParams.password,
    database: connectionParams.database,
    schema: connectionParams.schema || null,
    sid: connectionParams.sid || null,
    ssh: connectionParams.ssh,
    privateSSHKey: connectionParams.privateSSHKey || null,
    sshHost: connectionParams.sshHost || null,
    sshPort: connectionParams.sshPort || null,
    sshUsername: connectionParams.sshUsername || null,
    ssl: connectionParams.ssl || false,
    cert: connectionParams.cert || null,
    azure_encryption: connectionParams.azure_encryption || false,
    signing_key: connectionParams.signing_key || null,
    authSource: connectionParams.authSource || null,
    isTestConnection: connectionParams.isTestConnection || false,
  };
  return connection;
}
