import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.intarface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { SubscriptionLevelEnum } from '../../../enums/index.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { Constants } from '../../../helpers/constants/constants.js';
import { Encryptor } from '../../../helpers/encryption/encryptor.js';
import { ValidationHelper } from '../../../helpers/validators/validation-helper.js';
import { createStripeUsageRecord } from '../../stripe/stripe-helpers/create-stripe-usage-record.js';
import { getCurrentUserSubscription } from '../../stripe/stripe-helpers/get-current-user-subscription.js';
import { generateGwtToken, IToken } from '../../user/utils/generate-gwt-token.js';
import { VerifyAddUserInGroupDs } from '../application/data-sctructures/verify-add-user-in-group.ds.js';
import { IVerifyAddUserInGroup } from './use-cases.interfaces.js';

@Injectable()
export class VerifyAddUserInGroupUseCase
  extends AbstractUseCase<VerifyAddUserInGroupDs, IToken>
  implements IVerifyAddUserInGroup
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }

  protected async implementation(inputData: VerifyAddUserInGroupDs): Promise<IToken> {
    const { verificationString, user_password, user_name } = inputData;
    ValidationHelper.isPasswordStrongOrThrowError(user_password);
    const invitationEntity = await this._dbContext.userInvitationRepository.findUserInvitationWithVerificationString(
      verificationString,
    );
    if (!invitationEntity || !invitationEntity.user) {
      throw new HttpException(
        {
          message: Messages.VERIFICATION_LINK_INCORRECT,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    const invitationTimeInMs = new Date(invitationEntity.createdAt).getTime();
    const oneDayAgoInMs = new Date(Constants.ONE_DAY_AGO()).getTime();

    if (invitationTimeInMs <= oneDayAgoInMs) {
      throw new HttpException(
        {
          messages: Messages.VERIFICATION_LINK_EXPIRED,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    if (!invitationEntity.ownerId) {
      const foundUser = await this._dbContext.userRepository.findOneUserById(invitationEntity.user.id);
      foundUser.isActive = true;
      foundUser.password = await Encryptor.hashUserPassword(user_password);
      foundUser.name = user_name;
      const savedUser = await this._dbContext.userRepository.saveUserEntity(foundUser);
      await this._dbContext.userInvitationRepository.removeInvitationEntity(invitationEntity);
      return generateGwtToken(savedUser);
    }

    const foundOwner = await this._dbContext.userRepository.findOneUserById(invitationEntity.ownerId);
    let { usersInConnectionsCount, usersInConnections } =
      await this._dbContext.connectionRepository.calculateUsersInAllConnectionsOfThisOwner(invitationEntity.ownerId);
    const ownerSubscriptionLevel: SubscriptionLevelEnum = await getCurrentUserSubscription(foundOwner.stripeId);
    const canInviteMoreUsers = await this._dbContext.userRepository.checkOwnerInviteAbility(
      foundOwner.id,
      usersInConnectionsCount,
    );
    if (!canInviteMoreUsers) {
      throw new HttpException(
        {
          message: Messages.MAXIMUM_FREE_INVITATION_REACHED_CANNOT_BE_INVITED,
        },
        HttpStatus.PAYMENT_REQUIRED,
      );
    }

    const foundUser = await this._dbContext.userRepository.findOneUserById(invitationEntity.user.id);
    const newUserAlreadyInConnection: boolean = !!usersInConnections.find((userInConnection) => {
      return userInConnection.id === foundUser.id;
    });
    if (!newUserAlreadyInConnection) {
      ++usersInConnectionsCount;
      await createStripeUsageRecord(ownerSubscriptionLevel, usersInConnectionsCount);
    }
    foundUser.isActive = true;
    foundUser.password = await Encryptor.hashUserPassword(user_password);
    foundUser.name = user_name;
    const savedUser = await this._dbContext.userRepository.saveUserEntity(foundUser);
    await this._dbContext.userInvitationRepository.removeInvitationEntity(invitationEntity);
    return generateGwtToken(savedUser);
  }
}
