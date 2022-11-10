import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.intarface';
import { BaseType } from '../../../common/data-injection.tokens';
import { Messages } from '../../../exceptions/text/messages';
import { Constants } from '../../../helpers/constants/constants';
import { Encryptor } from '../../../helpers/encryption/encryptor';
import { ValidationHelper } from '../../../helpers/validators/validation-helper';
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

    const foundUser = await this._dbContext.userRepository.findOneUserById(invitationEntity.user.id);
    foundUser.isActive = true;
    foundUser.password = await Encryptor.hashUserPassword(user_password);
    foundUser.name = user_name;
    const savedUser = await this._dbContext.userRepository.saveUserEntity(foundUser);
    await this._dbContext.userInvitationRepository.removeInvitationEntity(invitationEntity);
    return generateGwtToken(savedUser);
  }
}
