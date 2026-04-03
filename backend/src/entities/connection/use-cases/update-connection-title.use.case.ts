import { Inject, Injectable, Scope } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { SuccessResponse } from '../../../microservices/saas-microservice/data-structures/common-responce.ds.js';
import { UpdateConnectionTitleDs } from '../application/data-structures/update-connection-title.ds.js';
import { IUpdateConnectionTitle } from './use-cases.interfaces.js';

@Injectable({ scope: Scope.REQUEST })
export class UpdateConnectionTitleUseCase
	extends AbstractUseCase<UpdateConnectionTitleDs, SuccessResponse>
	implements IUpdateConnectionTitle
{
	constructor(
		@Inject(BaseType.GLOBAL_DB_CONTEXT)
		protected _dbContext: IGlobalDatabaseContext,
	) {
		super();
	}

	protected async implementation(inputData: UpdateConnectionTitleDs): Promise<SuccessResponse> {
		const { connectionId, title } = inputData;

		const connection = await this._dbContext.connectionRepository.findOne({ where: { id: connectionId } });
		connection.title = title;
		await this._dbContext.connectionRepository.save(connection);
		return { success: true };
	}
}
