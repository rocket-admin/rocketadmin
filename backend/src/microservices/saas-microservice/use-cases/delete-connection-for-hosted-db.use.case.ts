import { Inject, Injectable, NotFoundException, Scope } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { CreatedConnectionDTO } from '../../../entities/connection/application/dto/created-connection.dto.js';
import { buildCreatedConnectionDs } from '../../../entities/connection/utils/build-created-connection.ds.js';
import { DeleteConnectionForHostedDbDto } from '../data-structures/delete-connection-for-hosted-db.dto.js';
import { IDeleteConnectionForHostedDb } from './saas-use-cases.interface.js';

@Injectable({ scope: Scope.REQUEST })
export class DeleteConnectionForHostedDbUseCase
	extends AbstractUseCase<DeleteConnectionForHostedDbDto, CreatedConnectionDTO>
	implements IDeleteConnectionForHostedDb
{
	constructor(
		@Inject(BaseType.GLOBAL_DB_CONTEXT)
		protected _dbContext: IGlobalDatabaseContext,
	) {
		super();
	}

	protected async implementation(inputData: DeleteConnectionForHostedDbDto): Promise<CreatedConnectionDTO> {
		const { companyId, hostedDatabaseId } = inputData;

		const connectionToDelete = await this._dbContext.connectionRepository.findAndDecryptConnection(
			hostedDatabaseId,
			null,
		);
		if (!connectionToDelete) {
			throw new NotFoundException(Messages.CONNECTION_NOT_FOUND);
		}

		const foundCompany = await this._dbContext.companyInfoRepository.findCompanyInfoByCompanyIdWithoutConnections(companyId);
		if (!foundCompany) {
			throw new NotFoundException(Messages.COMPANY_NOT_FOUND);
		}

		const result = await this._dbContext.connectionRepository.removeConnection(connectionToDelete);
		return buildCreatedConnectionDs(result, null, null);
	}
}
