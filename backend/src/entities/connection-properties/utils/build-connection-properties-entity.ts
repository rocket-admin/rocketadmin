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
  newConnectionProperties.logo_url = propertiesInfo.logo_url;
  newConnectionProperties.primary_color = propertiesInfo.primary_color;
  newConnectionProperties.secondary_color = propertiesInfo.secondary_color;
  newConnectionProperties.hostname = propertiesInfo.hostname;
  return newConnectionProperties;
}
