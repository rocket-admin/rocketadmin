import { Inject, Injectable, NotFoundException, Scope } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { CompanyInfoEntity } from '../../../entities/company-info/company-info.entity.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { ISaaSGetCompanyInfoByUserId } from './saas-use-cases.interface.js';

@Injectable({ scope: Scope.REQUEST })
export class GetFullCompanyInfoByUserIdUseCase
	extends AbstractUseCase<string, CompanyInfoEntity>
	implements ISaaSGetCompanyInfoByUserId
{
	constructor(
		@Inject(BaseType.GLOBAL_DB_CONTEXT)
		protected _dbContext: IGlobalDatabaseContext,
	) {
		super();
	}

	protected async implementation(userId: string): Promise<CompanyInfoEntity> {
		const foundCompany = await this._dbContext.companyInfoRepository.findFullCompanyInfoByUserId(userId);
		if (!foundCompany) {
			throw new NotFoundException(Messages.COMPANY_NOT_FOUND);
		}
		return foundCompany;
	}
}
