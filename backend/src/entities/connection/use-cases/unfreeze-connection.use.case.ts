import { HttpStatus, Inject, Injectable, Scope } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { ConnectionNotFoundException } from '../../../exceptions/custom-exceptions/connection-not-found-exception.js';
import { SuccessResponse } from '../../../microservices/saas-microservice/data-structures/common-responce.ds.js';
import { UnfreezeConnectionDs } from '../application/data-structures/unfreeze-connection.ds.js';
import { IUnfreezeConnection } from './use-cases.interfaces.js';

@Injectable({ scope: Scope.REQUEST })
export class UnfreezeConnectionUseCase
	extends AbstractUseCase<UnfreezeConnectionDs, SuccessResponse>
	implements IUnfreezeConnection
{
	constructor(
		@Inject(BaseType.GLOBAL_DB_CONTEXT)
		protected _dbContext: IGlobalDatabaseContext,
	) {
		super();
	}

	protected async implementation(inputData: UnfreezeConnectionDs): Promise<SuccessResponse> {
		const { connectionId } = inputData;

		const connection = await this._dbContext.connectionRepository.findOne({ where: { id: connectionId } });
		if (!connection) {
			throw new ConnectionNotFoundException(HttpStatus.BAD_REQUEST);
		}

		// Plan 46: no plan-gated connection types remain — any frozen connection may be unfrozen.
		connection.is_frozen = false;
		await this._dbContext.connectionRepository.save(connection);
		return { success: true };
	}
}
