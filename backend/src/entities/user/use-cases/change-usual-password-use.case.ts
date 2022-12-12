import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.intarface';
import { BaseType } from '../../../common/data-injection.tokens';
import { Messages } from '../../../exceptions/text/messages';
import { Encryptor } from '../../../helpers/encryption/encryptor';
import { ChangeUsualUserPasswordDs } from '../application/data-structures/change-usual-user-password.ds';
import { generateGwtToken, IToken } from '../utils/generate-gwt-token';
import { IUsualPasswordChange } from './user-use-cases.interfaces';

@Injectable()
export class ChangeUsualPasswordUseCase
  extends AbstractUseCase<ChangeUsualUserPasswordDs, IToken>
  implements IUsualPasswordChange
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }

  protected async implementation(userData: ChangeUsualUserPasswordDs): Promise<IToken> {
    const user = await this._dbContext.userRepository.findOneUserByEmail(userData.email);
    if (!user) {
      throw new HttpException(
        {
          message: Messages.USER_NOT_FOUND,
        },
        HttpStatus.UNAUTHORIZED,
      );
    }
    const oldPasswordValidationResult = await Encryptor.verifyUserPassword(userData.oldPassword, user.password);
    if (!oldPasswordValidationResult) {
      throw new HttpException(
        {
          message: Messages.PASSWORD_OLD_INVALID,
        },
        HttpStatus.FORBIDDEN,
      );
    }
    user.password = await Encryptor.hashUserPassword(userData.newPassword);
    const updatedUser = await this._dbContext.userRepository.saveUserEntity(user);
    return generateGwtToken(updatedUser);
  }
}
