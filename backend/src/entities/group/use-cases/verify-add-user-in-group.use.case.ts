import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.intarface';
import { BaseType } from '../../../common/data-injection.tokens';
import { SubscriptionLevelEnum } from '../../../enums';
import { Messages } from '../../../exceptions/text/messages';
import { Constants } from '../../../helpers/constants/constants';
import { Encryptor } from '../../../helpers/encryption/encryptor';
import { ValidationHelper } from '../../../helpers/validators/validation-helper';
import { createStripeUsageRecord } from '../../stripe/stripe-helpers/create-stripe-usage-record';
import { getCurrentUserSubscription } from '../../stripe/stripe-helpers/get-current-user-subscription';
import { generateGwtToken, IToken } from '../../user/utils/generate-gwt-token';
import { VerifyAddUserInGroupDs } from '../application/data-sctructures/verify-add-user-in-group.ds';
import { IVerifyAddUserInGroup } from './use-cases.interfaces';

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

    const newUserAlreadyInConnection: boolean = !!usersInConnections.find((userInConnection) => {
      return userInConnection.id === foundUser.id;
    });

    const foundUser = await this._dbContext.userRepository.findOneUserById(invitationEntity.user.id);
    foundUser.isActive = true;
    foundUser.password = await Encryptor.hashUserPassword(user_password);
    foundUser.name = user_name;
    const savedUser = await this._dbContext.userRepository.saveUserEntity(foundUser);
    await this._dbContext.userInvitationRepository.removeInvitationEntity(invitationEntity);
    if (!newUserAlreadyInConnection) {
      ++usersInConnectionsCount;
      await createStripeUsageRecord(ownerSubscriptionLevel, usersInConnectionsCount);
    }
    return generateGwtToken(savedUser);
  }
}
