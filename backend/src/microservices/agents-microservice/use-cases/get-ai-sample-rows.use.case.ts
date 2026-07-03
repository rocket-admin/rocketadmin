import { Inject, Injectable, Scope } from '@nestjs/common';
import { buildDAOsTableSettingsDs } from '@rocketadmin/shared-code/dist/src/helpers/data-structures-builders/table-settings.ds.builder.js';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { CedarPermissionsService } from '../../../entities/cedar-authorization/cedar-permissions.service.js';
import { buildCommonTableSettingsInput } from '../../../entities/table/utils/build-common-table-settings-input.util.js';
import { GetAiSampleRowsDs } from '../data-structures/agents.ds.js';
import { AiSampleRowsRO } from '../data-structures/agents-responses.ds.js';
import { assertUserCanReadTables, setupAiConnection } from '../utils/ai-data-access.helpers.js';
import { IGetAiSampleRows } from './agents-use-cases.interface.js';

export const AI_SAMPLE_ROWS_MAX_LIMIT = 5;

@Injectable({ scope: Scope.REQUEST })
export class GetAiSampleRowsUseCase
	extends AbstractUseCase<GetAiSampleRowsDs, AiSampleRowsRO>
	implements IGetAiSampleRows
{
	constructor(
		@Inject(BaseType.GLOBAL_DB_CONTEXT)
		protected _dbContext: IGlobalDatabaseContext,
		private readonly cedarPermissions: CedarPermissionsService,
	) {
		super();
	}

	protected async implementation(inputData: GetAiSampleRowsDs): Promise<AiSampleRowsRO> {
		const { connectionId, userId, masterPassword, tableName, limit } = inputData;

		const { foundConnection, dataAccessObject, userEmail } = await setupAiConnection(
			this._dbContext,
			connectionId,
			masterPassword,
			userId,
		);

		await assertUserCanReadTables(this.cedarPermissions, [tableName], userId, foundConnection.id);

		const tableStructure = await dataAccessObject.getTableStructure(tableName, userEmail);
		const readableColumns = await this.cedarPermissions.getReadableColumns(
			userId,
			foundConnection.id,
			tableName,
			tableStructure.map((column) => column.column_name),
		);

		const perPage = Math.min(limit ?? AI_SAMPLE_ROWS_MAX_LIMIT, AI_SAMPLE_ROWS_MAX_LIMIT);
		const settings = buildDAOsTableSettingsDs(buildCommonTableSettingsInput(null), null);
		const foundRows = await dataAccessObject.getRowsFromTable(
			tableName,
			settings,
			1,
			perPage,
			'',
			[],
			{ fields: [], value: '' },
			tableStructure,
			userEmail,
		);

		const rows = foundRows.data.map((row) =>
			Object.fromEntries(Object.entries(row).filter(([columnName]) => readableColumns.has(columnName))),
		);

		return {
			rows,
			rowCount: foundRows.pagination.total,
			largeDataset: foundRows.large_dataset,
		};
	}
}
