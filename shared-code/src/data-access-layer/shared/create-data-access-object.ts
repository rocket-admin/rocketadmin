import { ERROR_MESSAGES } from '../../helpers/errors/error-messages.js';
import { DataAccessObjectAgent } from '../data-access-objects/data-access-object-agent.js';
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
  ];
  if (process.env.NODE_ENV === 'test') {
    agentTypes.push('cli_mssql' as any, 'cli_mysql' as any, 'cli_oracledb' as any, 'cli_postgres' as any);
  }
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
  };
}

function buildConnectionParams(connectionParams: IUnknownConnectionParams): ConnectionParams {
  const requiredKeys = ['type', 'host', 'port', 'username', 'password', 'database'];

  if (connectionParams.ssh) {
    requiredKeys.push('sshHost', 'sshPort', 'sshUsername');
  }
  if (connectionParams.ssl) {
    requiredKeys.push('cert');
  }
  const missingKeys = requiredKeys.filter((key) => !connectionParams[key]);
  if (missingKeys.length > 0) {
    throw new Error(`Missing required key${missingKeys.length > 1 ? 's' : ''}: ${missingKeys.join(', ')}`);
  }
  return {
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
    sshPort: connectionParams.port || null,
    sshUsername: connectionParams.sshUsername || null,
    ssl: connectionParams.ssl || false,
    cert: connectionParams.cert || null,
    azure_encryption: connectionParams.azure_encryption || false,
    signing_key: connectionParams.signing_key || null,
  };
}
