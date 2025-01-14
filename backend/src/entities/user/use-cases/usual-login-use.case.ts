import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { Encryptor } from '../../../helpers/encryption/encryptor.js';
import { UsualLoginDs } from '../application/data-structures/usual-login.ds.js';
import { generateGwtToken, generateTemporaryJwtToken, IToken } from '../utils/generate-gwt-token.js';
import { IUsualLogin } from './user-use-cases.interfaces.js';
import { UserEntity } from '../user.entity.js';
import { get2FaScope } from '../utils/is-jwt-scope-need.util.js';

@Injectable()
export class UsualLoginUseCase extends AbstractUseCase<UsualLoginDs, IToken> implements IUsualLogin {
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }

  protected async implementation(userData: UsualLoginDs): Promise<IToken> {
    const { companyId } = userData;
    const email = userData.email.toLowerCase();
    let user: UserEntity = null;

    if (companyId) {
      user = await this._dbContext.userRepository.findOneUserByEmailAndCompanyId(email, companyId);
      if (!user) {
        throw new NotFoundException(Messages.USER_NOT_FOUND);
      }
    } else {
      const foundUsers = await this._dbContext.userRepository.findAllUsersWithEmail(email);
      if (foundUsers.length > 1) {
        throw new BadRequestException(Messages.LOGIN_DENIED_SHOULD_CHOOSE_COMPANY);
      }
      user = foundUsers[0];
    }

    if (!user) {
      throw new NotFoundException(Messages.USER_NOT_FOUND);
    }
    if (!userData.password) {
      throw new BadRequestException(Messages.PASSWORD_MISSING);
    }
    const passwordValidationResult = await Encryptor.verifyUserPassword(userData.password, user.password);
    if (!passwordValidationResult) {
      throw new BadRequestException(Messages.LOGIN_DENIED);
    }
    if (user.isOTPEnabled) {
      return generateTemporaryJwtToken(user);
    }
    const foundUserCompany = await this._dbContext.companyInfoRepository.finOneCompanyInfoByUserId(user.id);
    return generateGwtToken(user, get2FaScope(user, foundUserCompany));
  }
}
