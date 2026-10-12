import { ForeignKeyDS } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/data-structures/foreign-key.ds.js';
import { CedarPermissionsService } from '../../cedar-authorization/cedar-permissions.service.js';

export async function filterForeignKeysByReadPermission(
	foreignKeys: Array<ForeignKeyDS>,
	userId: string,
	connectionId: string,
	_masterPwd: string,
	cedarPermissions: CedarPermissionsService,
): Promise<Array<ForeignKeyDS>> {
	const readableSet = await cedarPermissions.getReadableTables(
		userId,
		connectionId,
		foreignKeys.map((fk) => fk.referenced_table_name),
	);
	return foreignKeys.filter((fk) => readableSet.has(fk.referenced_table_name));
}
