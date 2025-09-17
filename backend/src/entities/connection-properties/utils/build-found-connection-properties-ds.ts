import { ConnectionPropertiesEntity } from '../connection-properties.entity.js';
import { FoundConnectionPropertiesDs } from '../application/data-structures/found-connection-properties.ds.js';

export function buildFoundConnectionPropertiesDs(
  connectionProperties: ConnectionPropertiesEntity,
): FoundConnectionPropertiesDs {
  return {
    id: connectionProperties.id,
    hidden_tables: connectionProperties.hidden_tables,
    connectionId: connectionProperties.connection?.id,
    logo_url: connectionProperties.logo_url,
    primary_color: connectionProperties.primary_color,
    secondary_color: connectionProperties.secondary_color,
    hostname: connectionProperties.hostname,
    company_name: connectionProperties.company_name,
    tables_audit: connectionProperties.tables_audit,
    human_readable_table_names: connectionProperties.human_readable_table_names,
    allow_ai_requests: connectionProperties.allow_ai_requests,
    default_showing_table: connectionProperties.default_showing_table,
    table_categories: connectionProperties.table_categories
      ? connectionProperties.table_categories.map((c) => {
          return {
            id: c.id,
            category_name: c.category_name,
            tables: c.tables,
          };
        })
      : [],
  };
}
