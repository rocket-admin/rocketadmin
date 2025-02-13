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
  newConnectionProperties.company_name = propertiesInfo.company_name;
  newConnectionProperties.tables_audit = propertiesInfo.tables_audit;
  newConnectionProperties.human_readable_table_names = propertiesInfo.human_readable_table_names;
  newConnectionProperties.allow_ai_requests = propertiesInfo.allow_ai_requests;
  newConnectionProperties.default_showing_table = propertiesInfo.default_showing_table;
  return newConnectionProperties;
}
