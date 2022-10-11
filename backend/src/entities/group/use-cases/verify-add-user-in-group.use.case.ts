import { HttpException, HttpStatus, Inject, Injectable, Scope } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case';
import { IVerifyAddUserInGroup } from './use-cases.interfaces';
import { BaseType } from '../../../common/data-injection.tokens';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.intarface';
import { Messages } from '../../../exceptions/text/messages';
import { VerifyAddUserInGroupDs } from '../application/data-sctructures/verify-add-user-in-group.ds';
import { Encryptor } from '../../../helpers/encryption/encryptor';
import { generateGwtToken, IToken } from '../../user/utils/generate-gwt-token';
import { Constants } from '../../../helpers/constants/constants';

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
    const { verificationString, user_password } = inputData;
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
    const savedUser = await this._dbContext.userRepository.saveUserEntity(foundUser);
    await this._dbContext.userInvitationRepository.removeInvitationEntity(invitationEntity);
    return generateGwtToken(savedUser);
  }
}
