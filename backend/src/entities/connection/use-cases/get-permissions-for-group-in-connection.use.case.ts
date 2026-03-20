import { Inject, Injectable } from '@nestjs/common';
import { getDataAccessObject } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/create-data-access-object.js';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { AccessLevelEnum } from '../../../enums/access-level.enum.js';
import { TablePermissionDs } from '../../permission/application/data-structures/create-permissions.ds.js';
import { parseCedarPolicyToClassicalPermissions } from '../../cedar-authorization/cedar-policy-parser.js';
import { FoundPermissionsInConnectionDs } from '../application/data-structures/found-permissions-in-connection.ds.js';
import { GetPermissionsInConnectionDs } from '../application/data-structures/get-permissions-in-connection.ds.js';
import { IGetPermissionsForGroupInConnection } from './use-cases.interfaces.js';

@Injectable()
export class GetPermissionsForGroupInConnectionUseCase
	extends AbstractUseCase<GetPermissionsInConnectionDs, FoundPermissionsInConnectionDs>
	implements IGetPermissionsForGroupInConnection
{
	constructor(
		@Inject(BaseType.GLOBAL_DB_CONTEXT)
		protected _dbContext: IGlobalDatabaseContext,
	) {
		super();
	}

	protected async implementation(inputData: GetPermissionsInConnectionDs): Promise<FoundPermissionsInConnectionDs> {
		const group = await this._dbContext.groupRepository.findGroupWithPermissionsById(inputData.groupId);

		let connectionAccessLevel = AccessLevelEnum.none;
		let groupAccessLevel = AccessLevelEnum.none;
		const tablePermissionsMap = new Map<string, TablePermissionDs>();

		if (group?.cedarPolicy) {
			const parsed = parseCedarPolicyToClassicalPermissions(
				group.cedarPolicy,
				inputData.connectionId,
				inputData.groupId,
			);
			connectionAccessLevel = parsed.connection.accessLevel;
			groupAccessLevel = parsed.group.accessLevel;
			for (const table of parsed.tables) {
				tablePermissionsMap.set(table.tableName, table);
			}
		}

		const connection = await this._dbContext.connectionRepository.findAndDecryptConnection(
			inputData.connectionId,
			inputData.masterPwd,
		);
		const dao = getDataAccessObject(connection);
		const tables: Array<string> = (await dao.getTablesFromDB()).map((table) => table.tableName);

		const tablesWithAccessLevels: Array<TablePermissionDs> = tables.map((tableName) => {
			const existing = tablePermissionsMap.get(tableName);
			if (existing) {
				return existing;
			}
			return {
				tableName,
				accessLevel: {
					add: false,
					delete: false,
					edit: false,
					readonly: false,
					visibility: false,
				},
			};
		});

		const allTableSettingsInConnection = await this._dbContext.tableSettingsRepository.findTableSettingsInConnection(
			inputData.connectionId,
		);
		return {
			connection: {
				connectionId: inputData.connectionId,
				accessLevel: connectionAccessLevel,
			},
			group: {
				groupId: inputData.groupId,
				accessLevel: groupAccessLevel,
			},
			tables: tablesWithAccessLevels.map((table) => {
				const tableSettings = allTableSettingsInConnection.find(
					(tableSettings) => tableSettings.table_name === table.tableName,
				);
				return {
					...table,
					display_name: tableSettings?.display_name ?? null,
				};
			}),
		};
	}
}
