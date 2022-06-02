import { ConnectionPropertiesEntity } from '../connection-properties.entity';
import { FoundConnectionPropertiesDs } from '../application/data-structures/found-connection-properties.ds';

export function buildFoundConnectionPropertiesDs (connectionProperties: ConnectionPropertiesEntity): FoundConnectionPropertiesDs {
  return {
    id: connectionProperties.id,
    hidden_tables: connectionProperties.hidden_tables,
    connectionId: connectionProperties.connection.id,
  };
}
