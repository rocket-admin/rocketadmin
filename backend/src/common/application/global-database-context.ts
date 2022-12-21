import { Inject, Injectable } from '@nestjs/common';
import { DataSource, QueryRunner, Repository } from 'typeorm';
import { AgentEntity } from '../../entities/agent/agent.entity';
import { IAgentRepository } from '../../entities/agent/repository/agent.repository.interface';
import { customAgentRepositoryExtension } from '../../entities/agent/repository/custom-agent-repository-extension';
import { ConnectionPropertiesEntity } from '../../entities/connection-properties/connection-properties.entity';
import { IConnectionPropertiesRepository } from '../../entities/connection-properties/repository/connection-properties.repository.interface';
import { customConnectionPropertiesRepositoryExtension } from '../../entities/connection-properties/repository/custom-connection-properties-repository-extension';
import { ConnectionEntity } from '../../entities/connection/connection.entity';
import { IConnectionRepository } from '../../entities/connection/repository/connection.repository.interface';
import { customConnectionRepositoryExtension } from '../../entities/connection/repository/custom-connection-repository-extension';
import { CustomFieldsEntity } from '../../entities/custom-field/custom-fields.entity';
import { cusomFieldsCustomRepositoryExtension } from '../../entities/custom-field/repository/custom-field-repository-extension';
import { ICustomFieldsRepository } from '../../entities/custom-field/repository/custom-fields-repository.interface';
import { EmailVerificationEntity } from '../../entities/email/email-verification.entity';
import { emailVerificationRepositoryExtension } from '../../entities/email/repository/email-verification-custom-repository-extension';
import { IEmailVerificationRepository } from '../../entities/email/repository/email-verification.repository.interface';
import { GroupEntity } from '../../entities/group/group.entity';
import { groupCustomRepositoryExtension } from '../../entities/group/repository/group-custom-repository-extension';
import { IGroupRepository } from '../../entities/group/repository/group.repository.interface';
import { LogOutEntity } from '../../entities/log-out/log-out.entity';
import { logOutCustomRepositoryExtension } from '../../entities/log-out/repository/log-out-custom-repository-extension';
import { ILogOutRepository } from '../../entities/log-out/repository/log-out-repository.interface';
import { PermissionEntity } from '../../entities/permission/permission.entity';
import { permissionCustomRepositoryExtension } from '../../entities/permission/repository/permission-custom-repository-extension';
import { IPermissionRepository } from '../../entities/permission/repository/permission.repository.interface';
import { ITableActionRepository } from '../../entities/table-actions/repository/table-action-custom-reposiotory.interface';
import { tableActionsCustomRepositoryExtension } from '../../entities/table-actions/repository/table-actions-custom-repository.extension';
import { TableActionEntity } from '../../entities/table-actions/table-action.entity';
import { TableFieldInfoEntity } from '../../entities/table-field-info/table-field-info.entity';
import { TableInfoEntity } from '../../entities/table-info/table-info.entity';
import { tableLogsCustomRepositoryExtension } from '../../entities/table-logs/repository/table-logs-custom-repository-extension';
import { ITableLogsRepository } from '../../entities/table-logs/repository/table-logs-repository.interface';
import { TableLogsEntity } from '../../entities/table-logs/table-logs.entity';
import { tableSettingsCustomRepositoryExtension } from '../../entities/table-settings/repository/table-settings-custom-repository-extension';
import { ITableSettingsRepository } from '../../entities/table-settings/repository/table-settings.repository.interface';
import { TableSettingsEntity } from '../../entities/table-settings/table-settings.entity';
import { userAccessCustomReposiotoryExtension } from '../../entities/user-access/repository/user-access-custom-repository-extension';
import { IUserAccessRepository } from '../../entities/user-access/repository/user-access.repository.interface';
import { userActionCustomRepositoryExtension } from '../../entities/user-actions/repository/user-action-custom-repository-extension';
import { IUserActionRepository } from '../../entities/user-actions/repository/user-action.repository.interface';
import { UserActionEntity } from '../../entities/user-actions/user-action.entity';
import { userCustomRepositoryExtension } from '../../entities/user/repository/user-custom-repository-extension';
import { IUserRepository } from '../../entities/user/repository/user.repository.interface';
import { EmailChangeEntity } from '../../entities/user/user-email/email-change.entity';
import { emailChangeCustomRepositoryExtension } from '../../entities/user/user-email/repository/email-change-custom-repository-extension';
import { IEmailChangeRepository } from '../../entities/user/user-email/repository/email-change.repository.interface';
import { userInvitationCustomRepositoryExtension } from '../../entities/user/user-invitation/repository/user-invitation-custom-repository-extension';
import { IUserInvitationRepository } from '../../entities/user/user-invitation/repository/user-invitation-repository.interface';
import { UserInvitationEntity } from '../../entities/user/user-invitation/user-invitation.entity';
import { PasswordResetEntity } from '../../entities/user/user-password/password-reset.entity';
import { IPasswordResetRepository } from '../../entities/user/user-password/repository/password-reset-repository.interface';
import { userPasswordResetCustomRepositoryExtension } from '../../entities/user/user-password/repository/user-password-custom-repository-extension';
import { UserEntity } from '../../entities/user/user.entity';
import { tableWidgetsCustomRepositoryExtension } from '../../entities/widget/repository/table-widgets-custom-repsitory-extension';
import { ITableWidgetsRepository } from '../../entities/widget/repository/table-widgets-repository.interface';
import { TableWidgetEntity } from '../../entities/widget/table-widget.entity';
import { BaseType } from '../data-injection.tokens';
import { IGlobalDatabaseContext } from './global-database-context.intarface';

@Injectable()
export class GlobalDatabaseContext implements IGlobalDatabaseContext {
  private _queryRunner: QueryRunner;

  private _userRepository: IUserRepository;
  private _connectionRepository: IConnectionRepository;
  private _groupRepository: IGroupRepository;
  private _permissionRepository: IPermissionRepository;
  private _tableSettingsRepository: ITableSettingsRepository;
  private _userAccessRepository: IUserAccessRepository;
  private _agentRepository: IAgentRepository;
  private _emailVerificationRepository: IEmailVerificationRepository;
  private _passwordResetRepository: IPasswordResetRepository;
  private _emailChangeRepository: IEmailChangeRepository;
  private _userInvitationRepository: IUserInvitationRepository;
  private _connectionPropertiesRepository: IConnectionPropertiesRepository;
  private _customFieldsRepository: ICustomFieldsRepository;
  private _tableLogsRepository: ITableLogsRepository;
  private _userActionRepository: IUserActionRepository;
  private _logOutRepository: ILogOutRepository;
  private _tableWidgetsRepository: ITableWidgetsRepository;
  private _tableFieldInfoRepository: Repository<TableFieldInfoEntity>;
  private _tableInfoReposioty: Repository<TableInfoEntity>;
  private _tableActionRepository: ITableActionRepository;

  public constructor(
    @Inject(BaseType.DATA_SOURCE)
    public appDataSource: DataSource,
  ) {
    this.initRepositories();
  }

  private initRepositories(): void {
    this._userRepository = this.appDataSource.getRepository(UserEntity).extend(userCustomRepositoryExtension);
    this._connectionRepository = this.appDataSource
      .getRepository(ConnectionEntity)
      .extend(customConnectionRepositoryExtension);
    this._groupRepository = this.appDataSource.getRepository(GroupEntity).extend(groupCustomRepositoryExtension);
    this._permissionRepository = this.appDataSource
      .getRepository(PermissionEntity)
      .extend(permissionCustomRepositoryExtension);
    this._tableSettingsRepository = this.appDataSource
      .getRepository(TableSettingsEntity)
      .extend(tableSettingsCustomRepositoryExtension);
    this._userAccessRepository = this.appDataSource
      .getRepository(PermissionEntity)
      .extend(userAccessCustomReposiotoryExtension);
    this._agentRepository = this.appDataSource.getRepository(AgentEntity).extend(customAgentRepositoryExtension);
    this._emailVerificationRepository = this.appDataSource
      .getRepository(EmailVerificationEntity)
      .extend(emailVerificationRepositoryExtension);
    this._passwordResetRepository = this.appDataSource
      .getRepository(PasswordResetEntity)
      .extend(userPasswordResetCustomRepositoryExtension);
    this._emailChangeRepository = this.appDataSource
      .getRepository(EmailChangeEntity)
      .extend(emailChangeCustomRepositoryExtension);
    this._userInvitationRepository = this.appDataSource
      .getRepository(UserInvitationEntity)
      .extend(userInvitationCustomRepositoryExtension);
    this._connectionPropertiesRepository = this.appDataSource
      .getRepository(ConnectionPropertiesEntity)
      .extend(customConnectionPropertiesRepositoryExtension);
    this._customFieldsRepository = this.appDataSource
      .getRepository(CustomFieldsEntity)
      .extend(cusomFieldsCustomRepositoryExtension);
    this._tableLogsRepository = this.appDataSource
      .getRepository(TableLogsEntity)
      .extend(tableLogsCustomRepositoryExtension);
    this._userActionRepository = this.appDataSource
      .getRepository(UserActionEntity)
      .extend(userActionCustomRepositoryExtension);
    this._logOutRepository = this.appDataSource.getRepository(LogOutEntity).extend(logOutCustomRepositoryExtension);
    this._tableWidgetsRepository = this.appDataSource
      .getRepository(TableWidgetEntity)
      .extend(tableWidgetsCustomRepositoryExtension);
    this._tableInfoReposioty = this.appDataSource.getRepository(TableInfoEntity);
    this._tableFieldInfoRepository = this.appDataSource.getRepository(TableFieldInfoEntity);
    this._tableActionRepository = this.appDataSource
      .getRepository(TableActionEntity)
      .extend(tableActionsCustomRepositoryExtension);
  }

  public get userRepository(): IUserRepository {
    return this._userRepository;
  }

  public get connectionRepository(): IConnectionRepository {
    return this._connectionRepository;
  }

  public get groupRepository(): IGroupRepository {
    return this._groupRepository;
  }

  public get permissionRepository(): IPermissionRepository {
    return this._permissionRepository;
  }

  public get tableSettingsRepository(): ITableSettingsRepository {
    return this._tableSettingsRepository;
  }

  public get userAccessRepository(): IUserAccessRepository {
    return this._userAccessRepository;
  }

  public get agentRepository(): IAgentRepository {
    return this._agentRepository;
  }

  public get emailVerificationRepository(): IEmailVerificationRepository {
    return this._emailVerificationRepository;
  }

  public get passwordResetRepository(): IPasswordResetRepository {
    return this._passwordResetRepository;
  }

  public get emailChangeRepository(): IEmailChangeRepository {
    return this._emailChangeRepository;
  }

  public get userInvitationRepository(): IUserInvitationRepository {
    return this._userInvitationRepository;
  }

  public get connectionPropertiesRepository(): IConnectionPropertiesRepository {
    return this._connectionPropertiesRepository;
  }

  public get customFieldsRepository(): ICustomFieldsRepository {
    return this._customFieldsRepository;
  }

  public get tableLogsRepository(): ITableLogsRepository {
    return this._tableLogsRepository;
  }

  public get userActionRepository(): IUserActionRepository {
    return this._userActionRepository;
  }

  public get logOutRepository(): ILogOutRepository {
    return this._logOutRepository;
  }

  public get tableWidgetsRepository(): ITableWidgetsRepository {
    return this._tableWidgetsRepository;
  }

  public get tableInfoRepository(): Repository<TableInfoEntity> {
    return this._tableInfoReposioty;
  }

  public get tableFieldInfoRepository(): Repository<TableFieldInfoEntity> {
    return this._tableFieldInfoRepository;
  }

  public get tableActionRepository(): ITableActionRepository {
    return this._tableActionRepository;
  }

  public startTransaction(): Promise<void> {
    this._queryRunner = this.appDataSource.createQueryRunner();
    this._queryRunner.startTransaction();
    return;
  }

  public async commitTransaction(): Promise<void> {
    if (!this._queryRunner) return;
    try {
      await this._queryRunner.commitTransaction();
    } catch (e) {
      throw e;
    } finally {
      await this._queryRunner.release();
    }
  }

  public async rollbackTransaction(): Promise<void> {
    if (!this._queryRunner) return;
    try {
      await this._queryRunner.rollbackTransaction();
    } catch (e) {
      console.error(e);
      throw e;
    } finally {
      await this._queryRunner.release();
    }
  }

  public async releaseQueryRunner(): Promise<void> {
    if (!this._queryRunner) return;
    await this._queryRunner.release();
  }
}
