import { HttpStatus, Inject, Injectable, Scope } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case';
import { UpgradeUserSubscriptionDs } from '../application/data-structures/upgrade-user-subscription.ds';
import { UpgradedUserSubscriptionDs } from '../application/data-structures/upgraded-user-subscription.ds';
import { IUpgradeSubscription } from './user-use-cases.interfaces';
import { BaseType } from '../../../common/data-injection.tokens';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.intarface';
import { HttpException } from '@nestjs/common/exceptions/http.exception';
import { Messages } from '../../../exceptions/text/messages';
import { upgradeUserSubscription } from '../../../helpers/stripe/upgrade-user-subscription';

@Injectable()
export class UpgradeSubscriptionUseCase
  extends AbstractUseCase<UpgradeUserSubscriptionDs, UpgradedUserSubscriptionDs>
  implements IUpgradeSubscription
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
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
    return await upgradeUserSubscription(inputData.subscriptionLevel, user.stripeId);
  }
}
