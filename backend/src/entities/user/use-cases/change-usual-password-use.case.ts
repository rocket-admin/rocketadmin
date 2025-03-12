import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { Encryptor } from '../../../helpers/encryption/encryptor.js';
import {
  ChangeUsualUserPasswordDs,
  ChangeUsualUserPasswordDto,
} from '../application/data-structures/change-usual-user-password.ds.js';
import { generateGwtToken, IToken } from '../utils/generate-gwt-token.js';
import { IUsualPasswordChange } from './user-use-cases.interfaces.js';
import { get2FaScope } from '../utils/is-jwt-scope-need.util.js';

@Injectable()
export class ChangeUsualPasswordUseCase
  extends AbstractUseCase<ChangeUsualUserPasswordDto, IToken>
  implements IUsualPasswordChange
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }

  protected async implementation(userData: ChangeUsualUserPasswordDs): Promise<IToken> {
    const user = await this._dbContext.userRepository.findOneUserById(userData.email);
    if (!user) {
      throw new NotFoundException(Messages.USER_NOT_FOUND);
    }
    const oldPasswordValidationResult = await Encryptor.verifyUserPassword(userData.oldPassword, user.password);
    if (!oldPasswordValidationResult) {
      throw new BadRequestException(Messages.PASSWORD_OLD_INVALID);
    }

    user.password = await Encryptor.hashUserPassword(userData.newPassword);
    const updatedUser = await this._dbContext.userRepository.saveUserEntity(user);
    const foundUserCompany = await this._dbContext.companyInfoRepository.finOneCompanyInfoByUserId(updatedUser.id);
    return generateGwtToken(updatedUser, get2FaScope(updatedUser, foundUserCompany));
  }
}
