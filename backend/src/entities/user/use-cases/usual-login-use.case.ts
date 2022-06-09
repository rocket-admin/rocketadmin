import AbstractUseCase from '../../../common/abstract-use.case';
import { HttpException, HttpStatus, Inject, Injectable, Scope } from '@nestjs/common';
import { IUsualLogin } from './user-use-cases.interfaces';
import { UsualLoginDs } from '../application/data-structures/usual-login.ds';
import { BaseType } from '../../../common/data-injection.tokens';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.intarface';
import { Encryptor } from '../../../helpers/encryption/encryptor';
import { generateGwtToken, IToken } from '../utils/generate-gwt-token';
import { Messages } from '../../../exceptions/text/messages';

@Injectable({ scope: Scope.REQUEST })
export class UsualLoginUseCase extends AbstractUseCase<UsualLoginDs, IToken> implements IUsualLogin {
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }

  protected async implementation(userData: UsualLoginDs): Promise<IToken> {
    const user = await this._dbContext.userRepository.findOneUserByEmail(userData.email);
    if (!user) {
      throw new HttpException(
        {
          message: Messages.LOGIN_DENIED,
        },
        HttpStatus.UNAUTHORIZED,
      );
    }
    if (!userData.password) {
      throw new HttpException(
        {
          message: Messages.LOGIN_DENIED,
        },
        HttpStatus.UNAUTHORIZED,
      );
    }
    const passwordValidationResult = await Encryptor.verifyUserPassword(userData.password, user.password);
    if (!passwordValidationResult) {
      throw new HttpException(
        {
          message: Messages.LOGIN_DENIED,
        },
        HttpStatus.UNAUTHORIZED,
      );
    }
    return generateGwtToken(user);
  }
}
