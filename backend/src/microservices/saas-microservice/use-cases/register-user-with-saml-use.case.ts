import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { RegisterUserDs } from '../../../entities/user/application/data-structures/register-user-ds.js';
import { ExternalRegistrationProviderEnum } from '../../../entities/user/enums/external-registration-provider.enum.js';
import { UserRoleEnum } from '../../../entities/user/enums/user-role.enum.js';
import { UserEntity } from '../../../entities/user/user.entity.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { SaasSAMLUserRegisterDS } from '../data-structures/saas-saml-user-register.ds.js';

@Injectable()
export class SaaSRegisterUserWIthSamlUseCase extends AbstractUseCase<SaasSAMLUserRegisterDS, UserEntity> {
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }

  public async implementation(inputData: SaasSAMLUserRegisterDS): Promise<UserEntity> {
    const { email, name, samlNameId, companyId } = inputData;
    const foundUser = await this._dbContext.userRepository.findOneUserByEmail(
      email,
      ExternalRegistrationProviderEnum.SAML,
      samlNameId,
    );
    if (foundUser) {
      return foundUser;
    }

    const userData: RegisterUserDs = {
      email: email,
      password: null,
      isActive: true,
      name: name ? name : null,
      gclidValue: null,
    };

    const savedUser = await this._dbContext.userRepository.saveRegisteringUser(
      userData,
      ExternalRegistrationProviderEnum.SAML,
    );

    const foundCompanyInfo = await this._dbContext.companyInfoRepository.findOne({ where: { id: companyId } });
    if (!foundCompanyInfo) {
      throw new NotFoundException(Messages.COMPANY_NOT_FOUND);
    }

    savedUser.company = foundCompanyInfo;
    savedUser.samlNameId = samlNameId;
    savedUser.role = UserRoleEnum.USER;

    return await this._dbContext.userRepository.saveUserEntity(savedUser);
  }
}
