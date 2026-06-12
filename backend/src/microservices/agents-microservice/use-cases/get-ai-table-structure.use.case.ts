import { Inject, Injectable, Scope } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { CedarPermissionsService } from '../../../entities/cedar-authorization/cedar-permissions.service.js';
import { GetAiTableStructureDs } from '../data-structures/agents.ds.js';
import { assertUserCanReadTables, getTableStructureInfo, setupAiConnection } from '../utils/ai-data-access.helpers.js';
import { IGetAiTableStructure } from './agents-use-cases.interface.js';

@Injectable({ scope: Scope.REQUEST })
export class GetAiTableStructureUseCase
	extends AbstractUseCase<GetAiTableStructureDs, Record<string, unknown>>
	implements IGetAiTableStructure
{
	constructor(
		@Inject(BaseType.GLOBAL_DB_CONTEXT)
		protected _dbContext: IGlobalDatabaseContext,
		private readonly cedarPermissions: CedarPermissionsService,
	) {
		super();
	}

	protected async implementation(inputData: GetAiTableStructureDs): Promise<Record<string, unknown>> {
		const { connectionId, userId, masterPassword, tableName } = inputData;

		const { foundConnection, dataAccessObject, userEmail } = await setupAiConnection(
			this._dbContext,
			connectionId,
			masterPassword,
			userId,
		);

		await assertUserCanReadTables(this.cedarPermissions, [tableName], userId, foundConnection.id);

		return await getTableStructureInfo(
			this.cedarPermissions,
			dataAccessObject,
			tableName,
			userEmail,
			foundConnection,
			userId,
		);
	}
}
