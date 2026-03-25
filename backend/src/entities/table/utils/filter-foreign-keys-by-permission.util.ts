import { ForeignKeyDS } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/data-structures/foreign-key.ds.js';
import { CedarPermissionsService } from '../../cedar-authorization/cedar-permissions.service.js';

export async function filterForeignKeysByReadPermission(
	foreignKeys: Array<ForeignKeyDS>,
	userId: string,
	connectionId: string,
	masterPwd: string,
	cedarPermissions: CedarPermissionsService,
): Promise<Array<ForeignKeyDS>> {
	const canReadResults = await Promise.all(
		foreignKeys.map(async (fk) => ({
			tableName: fk.referenced_table_name,
			canRead: await cedarPermissions.improvedCheckTableRead(userId, connectionId, fk.referenced_table_name, masterPwd),
		})),
	);
	const readableSet = new Set(canReadResults.filter((r) => r.canRead).map((r) => r.tableName));
	return foreignKeys.filter((fk) => readableSet.has(fk.referenced_table_name));
}
