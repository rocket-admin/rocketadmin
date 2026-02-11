import { getDataAccessObject } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/create-data-access-object.js';
import { ConnectionEntity } from '../../connection/connection.entity.js';

export async function findTablesInConnectionUtil(
	connection: ConnectionEntity,
	_userId: string,
	userEmail = 'unknown',
): Promise<Array<string>> {
	const dao = getDataAccessObject(connection);
	const tables = await dao.getTablesFromDB(userEmail);
	return tables.map((table) => table.tableName);
}
