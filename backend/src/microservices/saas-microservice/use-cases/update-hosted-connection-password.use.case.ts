import { Inject, Injectable, NotFoundException, Scope } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { decryptConnectionsCredentialsAsync } from '../../../entities/connection/utils/decrypt-connection-credentials-async.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { SuccessResponse } from '../data-structures/common-responce.ds.js';
import { UpdateHostedConnectionPasswordDto } from '../data-structures/update-hosted-connection-password.dto.js';
import { IUpdateHostedConnectionPassword } from './saas-use-cases.interface.js';

@Injectable({ scope: Scope.REQUEST })
export class UpdateHostedConnectionPasswordUseCase
	extends AbstractUseCase<UpdateHostedConnectionPasswordDto, SuccessResponse>
	implements IUpdateHostedConnectionPassword
{
	constructor(
		@Inject(BaseType.GLOBAL_DB_CONTEXT)
		protected _dbContext: IGlobalDatabaseContext,
	) {
		super();
	}

	protected async implementation(inputData: UpdateHostedConnectionPasswordDto): Promise<SuccessResponse> {
		const { companyId, databaseName, password } = inputData;

		const foundCompany =
			await this._dbContext.companyInfoRepository.findCompanyInfoByCompanyIdWithoutConnections(companyId);
		if (!foundCompany) {
			throw new NotFoundException(Messages.COMPANY_NOT_FOUND);
		}

		const companyConnections = await this._dbContext.connectionRepository.find({
			where: { company: { id: companyId } },
		});
		await decryptConnectionsCredentialsAsync(companyConnections);
		const connection = companyConnections.find((conn) => conn.database === databaseName);
		if (!connection) {
			throw new NotFoundException(Messages.CONNECTION_NOT_FOUND);
		}

		connection.password = password;
		await this._dbContext.connectionRepository.saveUpdatedConnection(connection);

		return { success: true };
	}
}
