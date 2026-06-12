import { Inject, Injectable, Scope } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { AiDataRequestDs } from '../data-structures/agents.ds.js';
import { AiConnectionContextRO } from '../data-structures/agents-responses.ds.js';
import { setupAiConnection } from '../utils/ai-data-access.helpers.js';
import { IGetAiConnectionContext } from './agents-use-cases.interface.js';

@Injectable({ scope: Scope.REQUEST })
export class GetAiConnectionContextUseCase
	extends AbstractUseCase<AiDataRequestDs, AiConnectionContextRO>
	implements IGetAiConnectionContext
{
	constructor(
		@Inject(BaseType.GLOBAL_DB_CONTEXT)
		protected _dbContext: IGlobalDatabaseContext,
	) {
		super();
	}

	protected async implementation(inputData: AiDataRequestDs): Promise<AiConnectionContextRO> {
		const { connectionId, userId, masterPassword } = inputData;

		const { foundConnection, isMongoDb, userEmail } = await setupAiConnection(
			this._dbContext,
			connectionId,
			masterPassword,
			userId,
		);

		return {
			connectionId: foundConnection.id,
			type: foundConnection.type as string,
			schema: foundConnection.schema ?? null,
			isMongoDb,
			userEmail,
		};
	}
}
