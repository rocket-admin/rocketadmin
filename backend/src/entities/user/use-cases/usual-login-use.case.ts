import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { Encryptor } from '../../../helpers/encryption/encryptor.js';
import { UsualLoginDs } from '../application/data-structures/usual-login.ds.js';
import { generateGwtToken, generateTemporaryJwtToken, IToken } from '../utils/generate-gwt-token.js';
import { IUsualLogin } from './user-use-cases.interfaces.js';
import { UserEntity } from '../user.entity.js';

@Injectable()
export class UsualLoginUseCase extends AbstractUseCase<UsualLoginDs, IToken> implements IUsualLogin {
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }

  protected async implementation(userData: UsualLoginDs): Promise<IToken> {
    const { email, companyId } = userData;
    let user: UserEntity = null;

    if (companyId) {
      user = await this._dbContext.userRepository.findOneUserByEmailAndCompanyId(email, companyId);
      if (!user) {
        throw new HttpException(
          {
            message: Messages.LOGIN_DENIED,
          },
          HttpStatus.UNAUTHORIZED,
        );
      }
    } else {
      const foundUsers = await this._dbContext.userRepository.findAllUsersWithEmail(email);
      if (foundUsers.length > 1) {
        throw new HttpException(
          {
            message: Messages.LOGIN_DENIED_SHOULD_CHOOSE_COMPANY,
          },
          HttpStatus.UNAUTHORIZED,
        );
      }
      user = foundUsers[0];
    }

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
    if (user.isOTPEnabled) {
      return generateTemporaryJwtToken(user);
    }
    return generateGwtToken(user);
  }
}
