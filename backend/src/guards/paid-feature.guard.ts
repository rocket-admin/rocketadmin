import { BadRequestException, CanActivate, ExecutionContext, Inject, Injectable } from '@nestjs/common';
import { BaseType } from '../common/data-injection.tokens.js';
import { IGlobalDatabaseContext } from '../common/application/global-database-context.interface.js';
import { Observable } from 'rxjs';
import { IRequestWithCognitoInfo } from '../authorization/cognito-decoded.interface.js';
import { validateUuidByRegex } from './utils/validate-uuid-by-regex.js';
import { SaasCompanyGatewayService } from '../microservices/gateways/saas-gateway.ts/saas-company-gateway.service.js';
import { isSaaS } from '../helpers/app/is-saas.js';
import { SubscriptionLevelEnum } from '../enums/subscription-level.enum.js';
import { Messages } from '../exceptions/text/messages.js';
import { NonAvailableInFreePlanException } from '../exceptions/custom-exceptions/non-available-in-free-plan-exception.js';

@Injectable()
export class PaidFeatureGuard implements CanActivate {
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
    private readonly saasCompanyGatewayService: SaasCompanyGatewayService,
  ) {}

  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    return new Promise(async (resolve, reject) => {
      const request: IRequestWithCognitoInfo = context.switchToHttp().getRequest();
      const userId: string = request.decoded.sub;
      let companyId: string = request.params?.companyId || request.params?.slug;
      if (!companyId || !validateUuidByRegex(companyId)) {
        companyId = request.body?.['companyId'];
      }
      if (!companyId || !validateUuidByRegex(companyId)) {
        const foundCompanyInfo = await this._dbContext.companyInfoRepository.findCompanyInfoByUserId(userId);
        companyId = foundCompanyInfo?.id;
      }
      if (!companyId || !validateUuidByRegex(companyId)) {
        reject(new BadRequestException(Messages.COMPANY_ID_MISSING));
        return;
      }
      if (!isSaaS()) {
        resolve(true);
        return;
      }
      try {
        const companyInfo = await this.saasCompanyGatewayService.getCompanyInfo(companyId);
        if (!companyInfo) {
          reject(new BadRequestException(Messages.COMPANY_NOT_FOUND));
          return;
        }
        if (companyInfo.subscriptionLevel === SubscriptionLevelEnum.FREE_PLAN) {
          reject(new NonAvailableInFreePlanException());
          return;
        }
        console.log('PaidFeatureGuard: Company has a paid subscription');
        resolve(true);
      } catch (e) {
        reject(e);
      }
      return;
    });
  }
}
