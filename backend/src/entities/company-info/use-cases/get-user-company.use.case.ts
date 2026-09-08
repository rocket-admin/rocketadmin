import { HttpException, HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { isSaaS } from '../../../helpers/app/is-saas.js';
import { SaasCompanyGatewayService } from '../../../microservices/gateways/saas-gateway.ts/saas-company-gateway.service.js';
import { FoundUserCompanyInfoDs } from '../application/data-structures/found-company-info.ds.js';
import { buildFoundCompanyInfoDs } from '../utils/build-found-company-info-ds.js';
import { IGetUserCompany } from './company-info-use-cases.interface.js';

@Injectable()
export class GetUserCompanyUseCase extends AbstractUseCase<string, FoundUserCompanyInfoDs> implements IGetUserCompany {
	private readonly logger = new Logger(GetUserCompanyUseCase.name);

	constructor(
		@Inject(BaseType.GLOBAL_DB_CONTEXT)
		protected _dbContext: IGlobalDatabaseContext,
		private readonly saasCompanyGatewayService: SaasCompanyGatewayService,
	) {
		super();
	}

	protected async implementation(userId: string): Promise<FoundUserCompanyInfoDs> {
		const foundUserCoreCompanyInfo = await this._dbContext.companyInfoRepository.findCompanyInfoByUserId(userId);

		if (!foundUserCoreCompanyInfo) {
			throw new HttpException(
				{
					message: Messages.COMPANY_NOT_FOUND,
				},
				HttpStatus.NOT_FOUND,
			);
		}

		let foundUserCompanySaasInfo = null;
		let customDomain = null;
		if (isSaaS()) {
			foundUserCompanySaasInfo = await this.saasCompanyGatewayService.getCompanyInfo(foundUserCoreCompanyInfo.id);
			if (!foundUserCompanySaasInfo) {
				this.logger.warn(
					`Company ${foundUserCoreCompanyInfo.id} (user ${userId}) exists in the core but the SaaS lookup returned no company data; responding 404 COMPANY_NOT_FOUND`,
				);
				throw new HttpException(
					{
						message: Messages.COMPANY_NOT_FOUND,
					},
					HttpStatus.NOT_FOUND,
				);
			}
			customDomain = await this.saasCompanyGatewayService.getCompanyCustomDomainById(foundUserCoreCompanyInfo.id);
		}
		return buildFoundCompanyInfoDs(foundUserCoreCompanyInfo, foundUserCompanySaasInfo, customDomain);
	}
}
