import { ConnectionPropertiesEntity } from '../connection-properties.entity.js';
import { CreateConnectionPropertiesDs } from '../application/data-structures/create-connection-properties.ds.js';
import { ConnectionEntity } from '../../connection/connection.entity.js';

export function buildConnectionPropertiesEntity(
  propertiesInfo: CreateConnectionPropertiesDs,
  connection: ConnectionEntity,
): ConnectionPropertiesEntity {
  const { hidden_tables } = propertiesInfo;
  const newConnectionProperties = new ConnectionPropertiesEntity();
  newConnectionProperties.connection = connection;
  newConnectionProperties.hidden_tables = hidden_tables;
  return newConnectionProperties;
}
