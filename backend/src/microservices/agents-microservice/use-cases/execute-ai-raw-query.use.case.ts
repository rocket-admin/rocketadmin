import { BadRequestException, Inject, Injectable, Scope } from '@nestjs/common';
import { ConnectionTypesEnum } from '@rocketadmin/shared-code/dist/src/shared/enums/connection-types-enum.js';
import { isValidSQLQuery, wrapQueryWithLimit } from '../../../ai-core/tools/query-validators.js';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { CedarPermissionsService } from '../../../entities/cedar-authorization/cedar-permissions.service.js';
import { assertUserCanReadQueryTables } from '../../../entities/visualizations/panel/utils/assert-query-tables-readable.util.js';
import { ExecuteAiRawQueryDs } from '../data-structures/agents.ds.js';
import { AiQueryResultRO } from '../data-structures/agents-responses.ds.js';
import { setupAiConnection } from '../utils/ai-data-access.helpers.js';
import { IExecuteAiRawQuery } from './agents-use-cases.interface.js';

@Injectable({ scope: Scope.REQUEST })
export class ExecuteAiRawQueryUseCase
	extends AbstractUseCase<ExecuteAiRawQueryDs, AiQueryResultRO>
	implements IExecuteAiRawQuery
{
	constructor(
		@Inject(BaseType.GLOBAL_DB_CONTEXT)
		protected _dbContext: IGlobalDatabaseContext,
		private readonly cedarPermissions: CedarPermissionsService,
	) {
		super();
	}

	protected async implementation(inputData: ExecuteAiRawQueryDs): Promise<AiQueryResultRO> {
		const { connectionId, userId, masterPassword, tableName, query } = inputData;

		const { foundConnection, dataAccessObject, userEmail } = await setupAiConnection(
			this._dbContext,
			connectionId,
			masterPassword,
			userId,
		);

		if (!isValidSQLQuery(query)) {
			throw new BadRequestException(
				'Invalid SQL query. Please ensure it is a read-only SELECT statement without any forbidden keywords.',
			);
		}

		await assertUserCanReadQueryTables({
			query,
			connectionType: foundConnection.type as ConnectionTypesEnum,
			connectionId: foundConnection.id,
			validateTableRead: (referencedTableName) =>
				this.cedarPermissions.improvedCheckTableRead(userId, foundConnection.id, referencedTableName),
			listAllTableNames: async () => (await dataAccessObject.getTablesFromDB()).map((table) => table.tableName),
		});

		const wrappedQuery = wrapQueryWithLimit(query, foundConnection.type as ConnectionTypesEnum);
		const queryResult = await dataAccessObject.executeRawQuery(wrappedQuery, tableName, userEmail);

		return { result: queryResult };
	}
}
