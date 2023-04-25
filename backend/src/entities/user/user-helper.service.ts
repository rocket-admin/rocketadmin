import { Inject, Injectable } from '@nestjs/common';
import { IGlobalDatabaseContext } from '../../common/application/global-database-context.intarface.js';
import { BaseType, DynamicModuleEnum } from '../../common/data-injection.tokens.js';
import { SubscriptionLevelEnum } from '../../enums/subscription-level.enum.js';
import { isSaaS } from '../../helpers/app/is-saas.js';
import { Constants } from '../../helpers/constants/constants.js';
import { IStripeSerice } from '../stripe/application/interfaces/stripe-service.interface.js';
import { FoundUserInGroupDs } from './application/data-structures/found-user-in-group.ds.js';
import { FoundUserDs } from './application/data-structures/found-user.ds.js';
import { UserEntity } from './user.entity.js';
import { getUserIntercomHash } from './utils/get-user-intercom-hash.js';

@Injectable()
export class UserHelperService {
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    private readonly _dbContext: IGlobalDatabaseContext,
    @Inject(DynamicModuleEnum.STRIPE_SERVICE)
    private readonly stripeService: IStripeSerice,
  ) {}

  public async checkOwnerInviteAbility(ownerId: string, usersCount: number): Promise<boolean> {
    if (usersCount <= Constants.FREE_PLAN_USERS_COUNT || !isSaaS()) {
      return true;
    }
    const foundOwner = await this._dbContext.userRepository.findOneUserById(ownerId);
    if (!foundOwner.stripeId) {
      return false;
    }
    const ownerSubscription = await this.stripeService.getCurrentUserSubscription(foundOwner.stripeId);
    if (ownerSubscription === SubscriptionLevelEnum.FREE_PLAN) {
      return false;
    }
    return true;
  }

  public buildFoundUserInGroupDs(user: UserEntity): FoundUserInGroupDs {
    return {
      id: user.id,
      email: user.email,
      createdAt: user.createdAt,
      isActive: user.isActive,
      name: user.name,
    };
  }

  public async buildFoundUserDs(user: UserEntity): Promise<FoundUserDs> {
    const portalLink = await this.stripeService.createPortalLink(user);
    const userSubscriptionLevel = await this.stripeService.getCurrentUserSubscription(user.stripeId);
    const intercomHash = getUserIntercomHash(user.id);
    return {
      id: user.id,
      createdAt: user.createdAt,
      isActive: user.isActive,
      email: user.email,
      portal_link: portalLink,
      subscriptionLevel: userSubscriptionLevel,
      intercom_hash: intercomHash,
      name: user.name,
    };
  }
}
