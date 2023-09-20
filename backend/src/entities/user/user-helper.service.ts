import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { IGlobalDatabaseContext } from '../../common/application/global-database-context.interface.js';
import { BaseType, DynamicModuleEnum } from '../../common/data-injection.tokens.js';
import { SubscriptionLevelEnum } from '../../enums/subscription-level.enum.js';
import { isSaaS } from '../../helpers/app/is-saas.js';
import { Constants } from '../../helpers/constants/constants.js';
import { IStripeService } from '../stripe/application/interfaces/stripe-service.interface.js';
import { FoundUserInGroupDs } from './application/data-structures/found-user-in-group.ds.js';
import { FoundUserDs } from './application/data-structures/found-user.ds.js';
import { UserEntity } from './user.entity.js';
import { getUserIntercomHash } from './utils/get-user-intercom-hash.js';
import { Encryptor } from '../../helpers/encryption/encryptor.js';
import { CompanyInfoEntity } from '../company-info/company-info.entity.js';
import { RegisterUserDs } from './application/data-structures/register-user-ds.js';

@Injectable()
export class UserHelperService implements OnModuleInit {
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    private readonly _dbContext: IGlobalDatabaseContext,
    @Inject(DynamicModuleEnum.STRIPE_SERVICE)
    private readonly stripeService: IStripeService,
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
      is_2fa_enabled: user.otpSecretKey !== null && user.isOTPEnabled,
      company: user.company ? { id: user.company.id } : null,
    };
  }

  public async onModuleInit(): Promise<void> {
    if (isSaaS()) {
      return;
    }
    const email = process.env.ADMIN_EMAIL || 'admin';
    const password = process.env.ADMIN_PASSWORD || Encryptor.generateRandomString(10);

    const registerUserData: RegisterUserDs = {
      email: email,
      password: password,
      isActive: true,
      gclidValue: null,
      name: 'Admin',
    };

    const savedUser = await this._dbContext.userRepository.saveRegisteringUser(registerUserData);
    const newCompanyInfo = new CompanyInfoEntity();
    newCompanyInfo.id = Encryptor.generateUUID();
    newCompanyInfo.users = [savedUser];
    await this._dbContext.companyInfoRepository.save(newCompanyInfo);
    console.info(`Admin user created with email: "${email}" and password: "${password}"`);
  }
}
