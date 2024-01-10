import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { FoundUserDs } from '../../../entities/user/application/data-structures/found-user.ds.js';
import { RegisterInvitedUserDS } from '../../../entities/user/application/data-structures/usual-register-user.ds.js';
import { sendEmailConfirmation } from '../../../entities/email/send-email.js';
import { RegisterUserDs } from '../../../entities/user/application/data-structures/register-user-ds.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { ValidationHelper } from '../../../helpers/validators/validation-helper.js';
import { ISaaSRegisterInvitedUser } from './saas-use-cases.interface.js';

@Injectable()
export class SaasRegisterInvitedUserUseCase
  extends AbstractUseCase<RegisterInvitedUserDS, FoundUserDs>
  implements ISaaSRegisterInvitedUser
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }

  protected async implementation(userData: RegisterInvitedUserDS): Promise<FoundUserDs> {
    const { email, password, name, companyId } = userData;
    ValidationHelper.isPasswordStrongOrThrowError(password);
    const foundUser = await this._dbContext.userRepository.findOneUserByEmailAndCompanyId(email, companyId);
    const foundCompany = await this._dbContext.companyInfoRepository.findCompanyInfoWithUsersById(companyId);

    if (foundUser) {
      throw new HttpException(
        {
          message: Messages.USER_ALREADY_REGISTERED(email),
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    if (!foundCompany) {
      throw new HttpException(
        {
          message: Messages.COMPANY_NOT_FOUND,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const registerUserData: RegisterUserDs = {
      email: email,
      password: password,
      isActive: false,
      gclidValue: null,
      name: name,
    };
    const savedUser = await this._dbContext.userRepository.saveRegisteringUser(registerUserData);
    
    savedUser.company = foundCompany;
    await this._dbContext.userRepository.saveUserEntity(savedUser);

    const createdEmailVerification = await this._dbContext.emailVerificationRepository.createOrUpdateEmailVerification(
      savedUser,
    );

    await sendEmailConfirmation(savedUser.email, createdEmailVerification.verification_string);
    return {
      id: savedUser.id,
      createdAt: savedUser.createdAt,
      isActive: savedUser.isActive,
      email: savedUser.email,
      intercom_hash: null,
      name: savedUser.name,
      is_2fa_enabled: false,
    };
  }
}
