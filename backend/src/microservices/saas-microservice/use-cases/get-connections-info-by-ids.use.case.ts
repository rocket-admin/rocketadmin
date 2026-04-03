import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { In } from 'typeorm';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { ConnectionEntity } from '../../../entities/connection/connection.entity.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { GetConnectionsInfoByIdsDS } from '../data-structures/get-connections-info-by-ids.ds.js';
import { IGetConnectionsInfoByIds } from './saas-use-cases.interface.js';

@Injectable()
export class GetConnectionsInfoByIdsUseCase
	extends AbstractUseCase<GetConnectionsInfoByIdsDS, Array<ConnectionEntity>>
	implements IGetConnectionsInfoByIds
{
	constructor(
		@Inject(BaseType.GLOBAL_DB_CONTEXT)
		protected _dbContext: IGlobalDatabaseContext,
	) {
		super();
	}

	protected async implementation(inputData: GetConnectionsInfoByIdsDS): Promise<Array<ConnectionEntity>> {
		const { connectionIds } = inputData;
		if (!connectionIds || connectionIds.length === 0) {
			throw new HttpException(
				{
					message: Messages.CONNECTION_ID_MISSING,
				},
				HttpStatus.BAD_REQUEST,
			);
		}

		const connections = await this._dbContext.connectionRepository.findBy({
			id: In(connectionIds),
		});

		return connections;
	}
}
