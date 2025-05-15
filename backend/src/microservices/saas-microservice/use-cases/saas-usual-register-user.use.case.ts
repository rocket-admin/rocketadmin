import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import assert from 'assert';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { CompanyInfoEntity } from '../../../entities/company-info/company-info.entity.js';
import { ConnectionEntity } from '../../../entities/connection/connection.entity.js';
import { EmailService } from '../../../entities/email/email/email.service.js';
import { GroupEntity } from '../../../entities/group/group.entity.js';
import { PermissionEntity } from '../../../entities/permission/permission.entity.js';
import { RegisterUserDs } from '../../../entities/user/application/data-structures/register-user-ds.js';
import { SaasUsualUserRegisterDS } from '../../../entities/user/application/data-structures/usual-register-user.ds.js';
import { FoundUserDto } from '../../../entities/user/dto/found-user.dto.js';
import { UserRoleEnum } from '../../../entities/user/enums/user-role.enum.js';
import { UserEntity } from '../../../entities/user/user.entity.js';
import { buildConnectionEntitiesFromTestDtos } from '../../../entities/user/utils/build-connection-entities-from-test-dtos.js';
import { buildDefaultAdminGroups } from '../../../entities/user/utils/build-default-admin-groups.js';
import { buildDefaultAdminPermissions } from '../../../entities/user/utils/build-default-admin-permissions.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { Constants } from '../../../helpers/constants/constants.js';
import { SaasCompanyGatewayService } from '../../gateways/saas-gateway.ts/saas-company-gateway.service.js';
import { ISaasRegisterUser } from './saas-use-cases.interface.js';

@Injectable()
export class SaasUsualRegisterUseCase
  extends AbstractUseCase<SaasUsualUserRegisterDS, FoundUserDto>
  implements ISaasRegisterUser
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
    private readonly saasCompanyGatewayService: SaasCompanyGatewayService,
    private readonly emailService: EmailService,
  ) {
    super();
  }

  protected async implementation(userData: SaasUsualUserRegisterDS): Promise<FoundUserDto> {
    const { email, password, gclidValue, name, companyId, companyName } = userData;
    const foundUser = await this._dbContext.userRepository.findOneUserByEmailAndCompanyId(email, companyId);
    const userCompany = await this._dbContext.companyInfoRepository.findCompanyInfoWithUsersById(companyId);

    if (foundUser) {
      throw new HttpException(
        {
          message: Messages.USER_ALREADY_REGISTERED(email),
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const registerUserData: RegisterUserDs = {
      email: email,
      password: password,
      isActive: false,
      gclidValue: gclidValue,
      name: name,
    };

    const savedUser = await this._dbContext.userRepository.saveRegisteringUser(registerUserData);

    const testConnections = Constants.getTestConnectionsArr();
    const testConnectionsEntities = buildConnectionEntitiesFromTestDtos(testConnections);
    const createdTestConnections = await Promise.all(
      testConnectionsEntities.map(async (connection): Promise<ConnectionEntity> => {
        assert(savedUser.id, 'User should be saved before creating connections');
        connection.author = savedUser;
        return await this._dbContext.connectionRepository.saveNewConnection(connection);
      }),
    );
    const testGroupsEntities = buildDefaultAdminGroups(savedUser, createdTestConnections);
    const createdTestGroups = await Promise.all(
      testGroupsEntities.map(async (group: GroupEntity) => {
        return await this._dbContext.groupRepository.saveNewOrUpdatedGroup(group);
      }),
    );
    const testPermissionsEntities = buildDefaultAdminPermissions(createdTestGroups);
    await Promise.all(
      testPermissionsEntities.map(async (permission: PermissionEntity) => {
        await this._dbContext.permissionRepository.saveNewOrUpdatedPermission(permission);
      }),
    );

    if (userCompany) {
      userCompany.users.push(savedUser);
      await this._dbContext.companyInfoRepository.save(userCompany);
    } else {
      await this.registerEmptyCompany(savedUser, createdTestConnections, companyId, companyName);
    }

    const createdEmailVerification =
      await this._dbContext.emailVerificationRepository.createOrUpdateEmailVerification(savedUser);
    const companyCustomDomain = await this.saasCompanyGatewayService.getCompanyCustomDomainById(companyId);

    await this.emailService.sendEmailConfirmation(
      savedUser.email,
      createdEmailVerification.verification_string,
      companyCustomDomain,
    );

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

  private async registerEmptyCompany(
    savedUser: UserEntity,
    testConnections: Array<ConnectionEntity>,
    companyId: string,
    companyName: string,
  ): Promise<CompanyInfoEntity> {
    if (!companyName) {
      companyName = 'New Company';
    }
    const newCompanyInfo = new CompanyInfoEntity();
    newCompanyInfo.id = companyId;
    newCompanyInfo.name = companyName;
    newCompanyInfo.show_test_connections = true;
    newCompanyInfo.connections = [...testConnections];
    const savedCompanyInfo = await this._dbContext.companyInfoRepository.save(newCompanyInfo);
    savedUser.company = savedCompanyInfo;
    savedUser.role = UserRoleEnum.ADMIN;
    await this._dbContext.userRepository.saveUserEntity(savedUser);
    return savedCompanyInfo;
  }
}
