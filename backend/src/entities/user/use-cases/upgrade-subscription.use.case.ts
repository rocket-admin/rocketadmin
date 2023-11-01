import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { HttpException } from '@nestjs/common/exceptions/http.exception.js';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType, DynamicModuleEnum } from '../../../common/data-injection.tokens.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { IStripeService } from '../../stripe/application/interfaces/stripe-service.interface.js';
import { UpgradedUserSubscriptionDs } from '../application/data-structures/upgraded-user-subscription.ds.js';
import { IUpgradeSubscription } from './user-use-cases.interfaces.js';
import { UpgradeUserSubscriptionDs } from '../application/data-structures/upgrade-user-subscription.ds.js';

@Injectable()
export class UpgradeSubscriptionUseCase
  extends AbstractUseCase<UpgradeUserSubscriptionDs, UpgradedUserSubscriptionDs>
  implements IUpgradeSubscription
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
    @Inject(DynamicModuleEnum.STRIPE_SERVICE)
    private readonly stripeService: IStripeService,
  ) {
    super();
  }

  protected async implementation(inputData: UpgradeUserSubscriptionDs): Promise<UpgradedUserSubscriptionDs> {
    const user = await this._dbContext.userRepository.findOneUserById(inputData.cognitoUserName);
    if (!user) {
      throw new HttpException(
        {
          message: Messages.USER_NOT_FOUND,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    return await this.stripeService.upgradeUserSubscription(inputData.subscriptionLevel, user.stripeId);
  }
}
