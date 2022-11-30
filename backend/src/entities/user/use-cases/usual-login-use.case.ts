import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.intarface';
import { BaseType } from '../../../common/data-injection.tokens';
import { Messages } from '../../../exceptions/text/messages';
import { Encryptor } from '../../../helpers/encryption/encryptor';
import { UsualLoginDs } from '../application/data-structures/usual-login.ds';
import { generateGwtToken, IToken } from '../utils/generate-gwt-token';
import { IUsualLogin } from './user-use-cases.interfaces';

@Injectable()
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
