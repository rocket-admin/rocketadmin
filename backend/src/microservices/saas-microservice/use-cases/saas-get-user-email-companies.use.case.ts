import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { FoundUserEmailCompaniesInfoDs } from '../../../entities/company-info/application/data-structures/found-company-info.ds.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { ISaasGetUserEmailCompanies } from './saas-use-cases.interface.js';

/**
 * Returns the companies a given email is registered in. This is the SaaS microservice bridge for the
 * open-source `GET /my/email/:email` endpoint (GetUserEmailCompaniesUseCase) — duplicated here on
 * purpose so rocketadmin-saas can expose the same lookup (used by the multi-company login picker)
 * through its own `/saas/*` surface. The open-source endpoint is left untouched.
 */
@Injectable()
export class SaasGetUserEmailCompaniesUseCase
	extends AbstractUseCase<string, Array<FoundUserEmailCompaniesInfoDs>>
	implements ISaasGetUserEmailCompanies
{
	constructor(
		@Inject(BaseType.GLOBAL_DB_CONTEXT)
		protected _dbContext: IGlobalDatabaseContext,
	) {
		super();
	}

	protected async implementation(userEmail: string): Promise<Array<FoundUserEmailCompaniesInfoDs>> {
		const foundCompanies = await this._dbContext.companyInfoRepository.findCompanyInfosByUserEmail(
			userEmail.toLowerCase(),
		);
		if (!foundCompanies.length) {
			throw new HttpException(
				{
					message: Messages.COMPANIES_USER_EMAIL_NOT_FOUND,
				},
				HttpStatus.BAD_REQUEST,
			);
		}
		return foundCompanies.map(({ id, name }) => ({ id, name }));
	}
}
