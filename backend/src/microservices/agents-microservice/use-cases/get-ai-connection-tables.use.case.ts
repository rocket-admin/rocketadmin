import { Inject, Injectable, Scope } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { CedarPermissionsService } from '../../../entities/cedar-authorization/cedar-permissions.service.js';
import { AiDataRequestDs } from '../data-structures/agents.ds.js';
import { AiConnectionTablesRO } from '../data-structures/agents-responses.ds.js';
import { setupAiConnection } from '../utils/ai-data-access.helpers.js';
import { IGetAiConnectionTables } from './agents-use-cases.interface.js';

@Injectable({ scope: Scope.REQUEST })
export class GetAiConnectionTablesUseCase
	extends AbstractUseCase<AiDataRequestDs, AiConnectionTablesRO>
	implements IGetAiConnectionTables
{
	constructor(
		@Inject(BaseType.GLOBAL_DB_CONTEXT)
		protected _dbContext: IGlobalDatabaseContext,
		private readonly cedarPermissions: CedarPermissionsService,
	) {
		super();
	}

	protected async implementation(inputData: AiDataRequestDs): Promise<AiConnectionTablesRO> {
		const { connectionId, userId, masterPassword } = inputData;

		const { foundConnection, dataAccessObject } = await setupAiConnection(
			this._dbContext,
			connectionId,
			masterPassword,
			userId,
		);

		const tables = await dataAccessObject.getTablesFromDB();
		const tableNames = tables.map((table) => table.tableName?.trim()).filter((name): name is string => Boolean(name));

		const readableFlags = await Promise.all(
			tableNames.map((tableName) =>
				this.cedarPermissions.improvedCheckTableRead(userId, foundConnection.id, tableName),
			),
		);
		const readableTableNames = tableNames.filter((_name, index) => readableFlags[index]);

		return { tables: readableTableNames };
	}
}
