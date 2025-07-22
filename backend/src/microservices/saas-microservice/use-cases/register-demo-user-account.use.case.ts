import { Inject, Injectable } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { CompanyInfoEntity } from '../../../entities/company-info/company-info.entity.js';
import { ConnectionEntity } from '../../../entities/connection/connection.entity.js';
import { DemoDataService } from '../../../entities/demo-data/demo-data.service.js';
import { SaaSRegisterDemoUserAccountDS } from '../../../entities/user/application/data-structures/demo-user-account-register.ds.js';
import { FoundUserDto } from '../../../entities/user/dto/found-user.dto.js';
import { UserRoleEnum } from '../../../entities/user/enums/user-role.enum.js';
import { UserEntity } from '../../../entities/user/user.entity.js';
import { ISaasDemoRegisterUser } from './saas-use-cases.interface.js';

@Injectable()
export class SaasRegisterDemoUserAccountUseCase
  extends AbstractUseCase<SaaSRegisterDemoUserAccountDS, FoundUserDto>
  implements ISaasDemoRegisterUser
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
    private readonly demoDataService: DemoDataService,
  ) {
    super();
  }

  protected async implementation(userData: SaaSRegisterDemoUserAccountDS): Promise<FoundUserDto> {
    const savedUser = await this.createDemoUser(userData);

    const createdTestConnections = await this.demoDataService.createDemoDataForUser(savedUser.id);

    const savedCompanyInfo = await this.createCompanyInfo(userData, createdTestConnections);

    savedUser.company = savedCompanyInfo;
    await this._dbContext.userRepository.saveUserEntity(savedUser);

    return this.buildFoundUserDto(savedUser);
  }

  private async createDemoUser(userData: SaaSRegisterDemoUserAccountDS): Promise<UserEntity> {
    const { email, gclidValue } = userData;

    const demoUser = new UserEntity();
    demoUser.email = email;
    demoUser.isDemoAccount = true;
    demoUser.gclid = gclidValue;
    demoUser.name = 'Demo User';
    demoUser.role = UserRoleEnum.ADMIN;

    return await this._dbContext.userRepository.save(demoUser);
  }

  private async createCompanyInfo(
    userData: SaaSRegisterDemoUserAccountDS,
    createdTestConnections: ConnectionEntity[],
  ): Promise<CompanyInfoEntity> {
    const { companyId, companyName } = userData;

    const newCompanyInfo = new CompanyInfoEntity();
    newCompanyInfo.id = companyId;
    newCompanyInfo.name = companyName;
    newCompanyInfo.show_test_connections = true;
    newCompanyInfo.connections = [...createdTestConnections];

    return await this._dbContext.companyInfoRepository.save(newCompanyInfo);
  }

  private buildFoundUserDto(savedUser: UserEntity): FoundUserDto {
    return {
      id: savedUser.id,
      createdAt: savedUser.createdAt,
      isActive: savedUser.isActive,
      email: savedUser.email,
      intercom_hash: null,
      name: savedUser.name,
      role: savedUser.role,
      is_2fa_enabled: false,
      suspended: false,
      externalRegistrationProvider: savedUser.externalRegistrationProvider,
      show_test_connections: savedUser.showTestConnections,
    };
  }
}
