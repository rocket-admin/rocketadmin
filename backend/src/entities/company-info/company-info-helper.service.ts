import { Inject, Injectable } from '@nestjs/common';
import { BaseType } from '../../common/data-injection.tokens.js';
import { SaasCompanyGatewayService } from '../../microservices/gateways/saas-gateway.ts/saas-company-gateway.service.js';
import { IGlobalDatabaseContext } from '../../common/application/global-database-context.interface.js';
import { isSaaS } from '../../helpers/app/is-saas.js';
import { SubscriptionLevelEnum } from '../../enums/subscription-level.enum.js';
import { Constants } from '../../helpers/constants/constants.js';

@Injectable()
export class CompanyInfoHelperService {
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
    private readonly saasCompanyGatewayService: SaasCompanyGatewayService,
  ) {}

  public async canInviteMoreUsers(companyId: string): Promise<boolean> {
    if (!isSaaS() || process.env.NODE_ENV === 'test') {
      return true;
    }

    const companyInformationFromSaaS = await this.saasCompanyGatewayService.getCompanyInfo(companyId);

    const countUsersInCompany = await this._dbContext.userRepository.countUsersInCompany(companyId);
    const countInvitationsInCompany =
      await this._dbContext.invitationInCompanyRepository.countNonExpiredInvitationsInCompany(companyId);

    if (companyInformationFromSaaS.subscriptionLevel === SubscriptionLevelEnum.FREE_PLAN) {
      return countUsersInCompany + countInvitationsInCompany < Constants.FREE_PLAN_USERS_COUNT;
    }
    return true;
  }
}
