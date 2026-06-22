import { Inject, Injectable, NotFoundException, Scope } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { SubscriptionLevelEnum } from '../../../enums/subscription-level.enum.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { isSaaS } from '../../../helpers/app/is-saas.js';
import { isTest } from '../../../helpers/app/is-test.js';
import { SaasCompanyGatewayService } from '../../gateways/saas-gateway.ts/saas-company-gateway.service.js';
import { GetCompanySubscriptionInfoDs } from '../data-structures/agents.ds.js';
import { CompanySubscriptionInfoRO } from '../data-structures/agents-responses.ds.js';
import { IGetCompanySubscriptionInfo } from './agents-use-cases.interface.js';

/**
 * Thin metadata provider for the agents microservice: resolves a user's company subscription level
 * via the saas gateway. The agents service (agents-core) owns all website-generation policy
 * (model tier, hosting caps, quota enforcement) and only reads this subscription metadata from here.
 */
@Injectable({ scope: Scope.REQUEST })
export class GetCompanySubscriptionInfoUseCase
	extends AbstractUseCase<GetCompanySubscriptionInfoDs, CompanySubscriptionInfoRO>
	implements IGetCompanySubscriptionInfo
{
	constructor(
		@Inject(BaseType.GLOBAL_DB_CONTEXT)
		protected _dbContext: IGlobalDatabaseContext,
		private readonly saasCompanyGatewayService: SaasCompanyGatewayService,
	) {
		super();
	}

	protected async implementation(inputData: GetCompanySubscriptionInfoDs): Promise<CompanySubscriptionInfoRO> {
		const { userId } = inputData;

		// Self-hosted / non-SaaS / test runs have no subscription concept.
		if (!isSaaS() || isTest()) {
			return { isSaaS: false, companyId: null, subscriptionLevel: null, isPaymentMethodAdded: false };
		}

		const company = await this._dbContext.companyInfoRepository.findCompanyInfoByUserId(userId);
		if (!company) {
			throw new NotFoundException(Messages.COMPANY_NOT_FOUND);
		}

		const companyInfo = await this.saasCompanyGatewayService.getCompanyInfo(company.id);
		return {
			isSaaS: true,
			companyId: company.id,
			subscriptionLevel: companyInfo?.subscriptionLevel ?? SubscriptionLevelEnum.FREE_PLAN,
			isPaymentMethodAdded: companyInfo?.is_payment_method_added ?? false,
		};
	}
}
