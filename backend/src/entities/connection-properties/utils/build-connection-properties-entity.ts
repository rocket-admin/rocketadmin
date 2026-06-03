import { ConnectionEntity } from '../../connection/connection.entity.js';
import { CreateConnectionPropertiesDs } from '../application/data-structures/create-connection-properties.ds.js';
import { ConnectionPropertiesEntity } from '../connection-properties.entity.js';

export function buildConnectionPropertiesEntity(
	propertiesInfo: CreateConnectionPropertiesDs,
	connection: ConnectionEntity,
): ConnectionPropertiesEntity {
	const { hidden_tables } = propertiesInfo;
	const newConnectionProperties = new ConnectionPropertiesEntity();
	newConnectionProperties.connection = connection;
	newConnectionProperties.hidden_tables = hidden_tables ?? null;
	newConnectionProperties.logo_url = propertiesInfo.logo_url ?? null;
	newConnectionProperties.primary_color = propertiesInfo.primary_color ?? '';
	newConnectionProperties.secondary_color = propertiesInfo.secondary_color ?? '';
	newConnectionProperties.hostname = propertiesInfo.hostname ?? null;
	newConnectionProperties.company_name = propertiesInfo.company_name ?? null;
	newConnectionProperties.tables_audit = propertiesInfo.tables_audit ?? true;
	newConnectionProperties.human_readable_table_names = propertiesInfo.human_readable_table_names ?? true;
	newConnectionProperties.allow_ai_requests = propertiesInfo.allow_ai_requests ?? true;
	newConnectionProperties.default_showing_table = propertiesInfo.default_showing_table ?? null;
	return newConnectionProperties;
}
