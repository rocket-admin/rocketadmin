import { Inject, Injectable, NotFoundException, Scope } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { GetHostedConnectionCredentialsDto } from '../data-structures/get-hosted-connection-credentials.dto.js';
import { HostedConnectionCredentialsRO } from '../data-structures/hosted-connection-credentials.ro.js';
import { IGetHostedConnectionCredentials } from './saas-use-cases.interface.js';

@Injectable({ scope: Scope.REQUEST })
export class GetHostedConnectionCredentialsUseCase
	extends AbstractUseCase<GetHostedConnectionCredentialsDto, HostedConnectionCredentialsRO>
	implements IGetHostedConnectionCredentials
{
	constructor(
		@Inject(BaseType.GLOBAL_DB_CONTEXT)
		protected _dbContext: IGlobalDatabaseContext,
	) {
		super();
	}

	protected async implementation(
		inputData: GetHostedConnectionCredentialsDto,
	): Promise<HostedConnectionCredentialsRO> {
		const connection = await this._dbContext.connectionRepository.findOneById(inputData.hostedDatabaseId);
		if (!connection) {
			throw new NotFoundException(Messages.CONNECTION_NOT_FOUND);
		}

		return {
			connectionId: connection.id,
			host: connection.host,
			port: connection.port,
			database: connection.database,
			username: connection.username,
			password: connection.password,
			is_frozen: connection.is_frozen,
		};
	}
}
