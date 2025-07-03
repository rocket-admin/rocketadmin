import { ConnectionEntity } from '../entities/connection/connection.entity.js';
import { ConnectionTypesEnum } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/enums/connection-types-enum.js';
import { ConnectionTypeTestEnum } from '../enums/connection-type.enum.js';
import { CreateConnectionDto } from '../entities/connection/application/dto/create-connection.dto.js';

export function isConnectionEntityAgent(connection: ConnectionEntity | CreateConnectionDto): boolean {
  const agentTypes = [
    ConnectionTypesEnum.agent_postgres,
    ConnectionTypesEnum.agent_mysql,
    ConnectionTypesEnum.agent_oracledb,
    ConnectionTypesEnum.agent_mssql,
    ConnectionTypesEnum.agent_ibmdb2,
    ConnectionTypesEnum.agent_mongodb,
    ConnectionTypeTestEnum.agent_cassandra,
  ];

  return agentTypes.includes(connection.type as ConnectionTypesEnum);
}

export function isConnectionTypeAgent(type: ConnectionTypesEnum | string): boolean {
  const connectionTypes = [
    ConnectionTypeTestEnum.agent_postgres,
    ConnectionTypeTestEnum.agent_mysql,
    ConnectionTypeTestEnum.agent_oracledb,
    ConnectionTypeTestEnum.agent_mssql,
    ConnectionTypeTestEnum.agent_ibmdb2,
    ConnectionTypeTestEnum.agent_mongodb,
    ConnectionTypeTestEnum.agent_cassandra,
  ];

  return connectionTypes.includes(type as ConnectionTypeTestEnum);
}
