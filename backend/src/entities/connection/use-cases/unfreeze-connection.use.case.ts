import { Inject, Injectable, Scope } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { SuccessResponse } from '../../../microservices/saas-microservice/data-structures/common-responce.ds.js';
import { UnfreezeConnectionDs } from '../application/data-structures/unfreeze-connection.ds.js';
import { IUnfreezeConnection } from './use-cases.interfaces.js';
import { isSaaS } from '../../../helpers/app/is-saas.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { NonAvailableInFreePlanException } from '../../../exceptions/custom-exceptions/non-available-in-free-plan-exception.js';
import { Constants } from '../../../helpers/constants/constants.js';
import { SaasCompanyGatewayService } from '../../../microservices/gateways/saas-gateway.ts/saas-company-gateway.service.js';
import { SubscriptionLevelEnum } from '../../../enums/subscription-level.enum.js';
import { ConnectionTypesEnum } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/enums/connection-types-enum.js';

@Injectable({ scope: Scope.REQUEST })
export class UnfreezeConnectionUseCase
  extends AbstractUseCase<UnfreezeConnectionDs, SuccessResponse>
  implements IUnfreezeConnection
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
    private readonly saasCompanyGatewayService: SaasCompanyGatewayService,
  ) {
    super();
  }

  protected async implementation(inputData: UnfreezeConnectionDs): Promise<SuccessResponse> {
    const { connectionId, userId } = inputData;

    const connection = await this._dbContext.connectionRepository.findOne({ where: { id: connectionId } });

    if (isSaaS()) {
      const userCompany = await this._dbContext.companyInfoRepository.finOneCompanyInfoByUserId(userId);
      const companyInfoFromSaas = await this.saasCompanyGatewayService.getCompanyInfo(userCompany.id);
      if (companyInfoFromSaas.subscriptionLevel === SubscriptionLevelEnum.FREE_PLAN) {
        if (Constants.NON_FREE_PLAN_CONNECTION_TYPES.includes(connection.type as ConnectionTypesEnum)) {
          throw new NonAvailableInFreePlanException(
            Messages.CANNOT_CREATE_CONNECTION_THIS_TYPE_IN_FREE_PLAN(connection.type as ConnectionTypesEnum),
          );
        }
      }
    }

    connection.is_frozen = false;
    await this._dbContext.connectionRepository.save(connection);
    return { success: true };
  }
}
