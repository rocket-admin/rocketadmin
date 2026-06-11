import { BadRequestException, Inject, Injectable, Scope } from '@nestjs/common';
import { isReadOnlyMongoAggregationPipeline, isValidMongoDbCommand } from '../../../ai-core/tools/query-validators.js';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { CedarPermissionsService } from '../../../entities/cedar-authorization/cedar-permissions.service.js';
import { ExecuteAiAggregationPipelineDs } from '../data-structures/agents.ds.js';
import { AiQueryResultRO } from '../data-structures/agents-responses.ds.js';
import { assertUserCanReadPipelineCollections, setupAiConnection } from '../utils/ai-data-access.helpers.js';
import { IExecuteAiAggregationPipeline } from './agents-use-cases.interface.js';

@Injectable({ scope: Scope.REQUEST })
export class ExecuteAiAggregationPipelineUseCase
	extends AbstractUseCase<ExecuteAiAggregationPipelineDs, AiQueryResultRO>
	implements IExecuteAiAggregationPipeline
{
	constructor(
		@Inject(BaseType.GLOBAL_DB_CONTEXT)
		protected _dbContext: IGlobalDatabaseContext,
		private readonly cedarPermissions: CedarPermissionsService,
	) {
		super();
	}

	protected async implementation(inputData: ExecuteAiAggregationPipelineDs): Promise<AiQueryResultRO> {
		const { connectionId, userId, masterPassword, tableName, pipeline } = inputData;

		const { foundConnection, dataAccessObject, userEmail } = await setupAiConnection(
			this._dbContext,
			connectionId,
			masterPassword,
			userId,
		);

		if (!isValidMongoDbCommand(pipeline)) {
			throw new BadRequestException(
				'Invalid MongoDB command. Please ensure it is a read-only aggregation pipeline without any forbidden keywords.',
			);
		}

		if (!isReadOnlyMongoAggregationPipeline(pipeline)) {
			throw new BadRequestException(
				'Invalid MongoDB command. Aggregation stages that write data ($out, $merge) or execute ' +
					'server-side JavaScript ($function, $accumulator, $where) are not allowed.',
			);
		}

		await assertUserCanReadPipelineCollections(
			this.cedarPermissions,
			pipeline,
			tableName,
			userId,
			foundConnection.id,
			dataAccessObject,
		);

		const pipelineResult = await dataAccessObject.executeRawQuery(pipeline, tableName, userEmail);

		return { result: pipelineResult };
	}
}
