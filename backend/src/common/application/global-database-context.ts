import { Inject, Injectable, Scope } from '@nestjs/common';
import { DataSource, QueryRunner, Repository } from 'typeorm';
import { AgentEntity } from '../../entities/agent/agent.entity.js';
import { IAgentRepository } from '../../entities/agent/repository/agent.repository.interface.js';
import { customAgentRepositoryExtension } from '../../entities/agent/repository/custom-agent-repository-extension.js';
import { ConnectionPropertiesEntity } from '../../entities/connection-properties/connection-properties.entity.js';
import { IConnectionPropertiesRepository } from '../../entities/connection-properties/repository/connection-properties.repository.interface.js';
import { customConnectionPropertiesRepositoryExtension } from '../../entities/connection-properties/repository/custom-connection-properties-repository-extension.js';
import { ConnectionEntity } from '../../entities/connection/connection.entity.js';
import { IConnectionRepository } from '../../entities/connection/repository/connection.repository.interface.js';
import { customConnectionRepositoryExtension } from '../../entities/connection/repository/custom-connection-repository-extension.js';
import { CustomFieldsEntity } from '../../entities/custom-field/custom-fields.entity.js';
import { cusomFieldsCustomRepositoryExtension } from '../../entities/custom-field/repository/custom-field-repository-extension.js';
import { ICustomFieldsRepository } from '../../entities/custom-field/repository/custom-fields-repository.interface.js';
import { EmailVerificationEntity } from '../../entities/email/email-verification.entity.js';
import { emailVerificationRepositoryExtension } from '../../entities/email/repository/email-verification-custom-repository-extension.js';
import { IEmailVerificationRepository } from '../../entities/email/repository/email-verification.repository.interface.js';
import { GroupEntity } from '../../entities/group/group.entity.js';
import { groupCustomRepositoryExtension } from '../../entities/group/repository/group-custom-repository-extension.js';
import { IGroupRepository } from '../../entities/group/repository/group.repository.interface.js';
import { LogOutEntity } from '../../entities/log-out/log-out.entity.js';
import { logOutCustomRepositoryExtension } from '../../entities/log-out/repository/log-out-custom-repository-extension.js';
import { ILogOutRepository } from '../../entities/log-out/repository/log-out-repository.interface.js';
import { PermissionEntity } from '../../entities/permission/permission.entity.js';
import { permissionCustomRepositoryExtension } from '../../entities/permission/repository/permission-custom-repository-extension.js';
import { IPermissionRepository } from '../../entities/permission/repository/permission.repository.interface.js';
import { ITableActionRepository } from '../../entities/table-actions/table-actions-module/repository/table-action-custom-repository.interface.js';
import { tableActionsCustomRepositoryExtension } from '../../entities/table-actions/table-actions-module/repository/table-actions-custom-repository.extension.js';
import { TableActionEntity } from '../../entities/table-actions/table-actions-module/table-action.entity.js';
import { TableFieldInfoEntity } from '../../entities/table-field-info/table-field-info.entity.js';
import { TableInfoEntity } from '../../entities/table-info/table-info.entity.js';
import { tableLogsCustomRepositoryExtension } from '../../entities/table-logs/repository/table-logs-custom-repository-extension.js';
import { ITableLogsRepository } from '../../entities/table-logs/repository/table-logs-repository.interface.js';
import { TableLogsEntity } from '../../entities/table-logs/table-logs.entity.js';
import { tableSettingsCustomRepositoryExtension } from '../../entities/table-settings/repository/table-settings-custom-repository-extension.js';
import { ITableSettingsRepository } from '../../entities/table-settings/repository/table-settings.repository.interface.js';
import { TableSettingsEntity } from '../../entities/table-settings/table-settings.entity.js';
import { userAccessCustomReposiotoryExtension } from '../../entities/user-access/repository/user-access-custom-repository-extension.js';
import { IUserAccessRepository } from '../../entities/user-access/repository/user-access.repository.interface.js';
import { userActionCustomRepositoryExtension } from '../../entities/user-actions/repository/user-action-custom-repository-extension.js';
import { IUserActionRepository } from '../../entities/user-actions/repository/user-action.repository.interface.js';
import { UserActionEntity } from '../../entities/user-actions/user-action.entity.js';
import { userCustomRepositoryExtension } from '../../entities/user/repository/user-custom-repository-extension.js';
import { IUserRepository } from '../../entities/user/repository/user.repository.interface.js';
import { EmailChangeEntity } from '../../entities/user/user-email/email-change.entity.js';
import { emailChangeCustomRepositoryExtension } from '../../entities/user/user-email/repository/email-change-custom-repository-extension.js';
import { IEmailChangeRepository } from '../../entities/user/user-email/repository/email-change.repository.interface.js';
import { userInvitationCustomRepositoryExtension } from '../../entities/user/user-invitation/repository/user-invitation-custom-repository-extension.js';
import { IUserInvitationRepository } from '../../entities/user/user-invitation/repository/user-invitation-repository.interface.js';
import { UserInvitationEntity } from '../../entities/user/user-invitation/user-invitation.entity.js';
import { PasswordResetEntity } from '../../entities/user/user-password/password-reset.entity.js';
import { IPasswordResetRepository } from '../../entities/user/user-password/repository/password-reset-repository.interface.js';
import { userPasswordResetCustomRepositoryExtension } from '../../entities/user/user-password/repository/user-password-custom-repository-extension.js';
import { UserEntity } from '../../entities/user/user.entity.js';
import { tableWidgetsCustomRepositoryExtension } from '../../entities/widget/repository/table-widgets-custom-repsitory-extension.js';
import { ITableWidgetsRepository } from '../../entities/widget/repository/table-widgets-repository.interface.js';
import { TableWidgetEntity } from '../../entities/widget/table-widget.entity.js';
import { BaseType } from '../data-injection.tokens.js';
import { IGlobalDatabaseContext } from './global-database-context.interface.js';
import { IUserGitHubIdentifierRepository } from '../../entities/user/user-github-identifier/repository/user-github-identifier-repository.interface.js';
import { GitHubUserIdentifierEntity } from '../../entities/user/user-github-identifier/github-user-identifier.entity.js';
import { userGitHubIdentifierCustomRepositoryExtension } from '../../entities/user/user-github-identifier/repository/user-github-identifier-custom-repository.extension.js';
import { ICompanyInfoRepository } from '../../entities/company-info/repository/company-info-repository.interface.js';
import { CompanyInfoEntity } from '../../entities/company-info/company-info.entity.js';
import { companyInfoRepositoryExtension } from '../../entities/company-info/repository/company-info-custom-repository.extension.js';
import { InvitationInCompanyEntity } from '../../entities/company-info/invitation-in-company/invitation-in-company.entity.js';
import { IInvitationInCompanyRepository } from '../../entities/company-info/invitation-in-company/repository/invitation-repository.interface.js';
import { invitationInCompanyCustomRepositoryExtension } from '../../entities/company-info/invitation-in-company/repository/invitation-in-company-custom-repository-extension.js';
import { UserSessionSettingsEntity } from '../../entities/user/user-session-settings/user-session-settings.entity.js';
import { userSessionSettingsRepositoryExtension } from '../../entities/user/user-session-settings/reposiotory/user-session-settings-custom-repository.extension.js';
import { IUserSessionSettings } from '../../entities/user/user-session-settings/reposiotory/user-session-settings-repository.interface.js';
import { ActionRulesEntity } from '../../entities/table-actions/table-action-rules-module/action-rules.entity.js';
import { IActionRulesRepository } from '../../entities/table-actions/table-action-rules-module/repository/action-rules-custom-repository.interface.js';
import { actionRulesCustomRepositoryExtension } from '../../entities/table-actions/table-action-rules-module/repository/action-rules-custom-repository.js';
import { ActionEventsEntity } from '../../entities/table-actions/table-action-events-module/action-event.entity.js';
import { IActionEventsRepository } from '../../entities/table-actions/table-action-events-module/repository/action-events-custom-repository.interface.js';
import { actionEventsCustomRepositoryExtension } from '../../entities/table-actions/table-action-events-module/repository/action-events-custom-repository.extension.js';
import { IUserApiKeyRepository } from '../../entities/api-key/repository/user-api-key-repository.interface.js';
import { UserApiKeyEntity } from '../../entities/api-key/api-key.entity.js';
import { userApiRepositoryExtension } from '../../entities/api-key/repository/user-api-key-repository.extension.js';
import { AiUserThreadEntity } from '../../entities/ai/ai-data-entities/ai-user-threads/ai-user-threads.entity.js';
import { IAiUserThreadsRepository } from '../../entities/ai/ai-data-entities/ai-user-threads/ai-user-threads-repository.interface.js';
import { IAiUserFilesRepository } from '../../entities/ai/ai-data-entities/ai-user-files/ai-user-files-repository.interface.js';
import { AiUserFileEntity } from '../../entities/ai/ai-data-entities/ai-user-files/ai-user-files.entity.js';
import { aiUserThreadRepositoryExtension } from '../../entities/ai/ai-data-entities/ai-user-threads/ai-user-threads-repository.extension.js';
import { aiUserFileRepositoryExtension } from '../../entities/ai/ai-data-entities/ai-user-files/ai-user-file-repository.extension.js';
import { CompanyLogoEntity } from '../../entities/company-logo/company-logo.entity.js';

@Injectable({ scope: Scope.REQUEST })
export class GlobalDatabaseContext implements IGlobalDatabaseContext {
  private _queryRunner: QueryRunner;

  private _userRepository: Repository<UserEntity> & IUserRepository;
  private _connectionRepository: Repository<ConnectionEntity> & IConnectionRepository;
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
  private _tableActionRepository: Repository<TableActionEntity> & ITableActionRepository;
  private _userGitHubIdentifierRepository: IUserGitHubIdentifierRepository;
  private _companyInfoRepository: Repository<CompanyInfoEntity> & ICompanyInfoRepository;
  private _invitationInCompanyRepository: Repository<InvitationInCompanyEntity> & IInvitationInCompanyRepository;
  private _userSessionSettingsRepository: Repository<UserSessionSettingsEntity> & IUserSessionSettings;
  private _actionRulesRepository: Repository<ActionRulesEntity> & IActionRulesRepository;
  private _actionEventsRepository: Repository<ActionEventsEntity> & IActionEventsRepository;
  private _userApiKeysRepository: Repository<UserApiKeyEntity> & IUserApiKeyRepository;
  private _aiUserThreadsRepository: Repository<AiUserThreadEntity> & IAiUserThreadsRepository;
  private _aiUserFilesRepository: Repository<AiUserFileEntity> & IAiUserFilesRepository;
  private _companyLogoRepository: Repository<CompanyLogoEntity>;

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
    this._userGitHubIdentifierRepository = this.appDataSource
      .getRepository(GitHubUserIdentifierEntity)
      .extend(userGitHubIdentifierCustomRepositoryExtension);
    this._companyInfoRepository = this.appDataSource
      .getRepository(CompanyInfoEntity)
      .extend(companyInfoRepositoryExtension);
    this._invitationInCompanyRepository = this.appDataSource
      .getRepository(InvitationInCompanyEntity)
      .extend(invitationInCompanyCustomRepositoryExtension);
    this._userSessionSettingsRepository = this.appDataSource
      .getRepository(UserSessionSettingsEntity)
      .extend(userSessionSettingsRepositoryExtension);
    this._actionRulesRepository = this.appDataSource
      .getRepository(ActionRulesEntity)
      .extend(actionRulesCustomRepositoryExtension);
    this._actionEventsRepository = this.appDataSource
      .getRepository(ActionEventsEntity)
      .extend(actionEventsCustomRepositoryExtension);
    this._userApiKeysRepository = this.appDataSource.getRepository(UserApiKeyEntity).extend(userApiRepositoryExtension);
    this._aiUserThreadsRepository = this.appDataSource
      .getRepository(AiUserThreadEntity)
      .extend(aiUserThreadRepositoryExtension);
    this._aiUserFilesRepository = this.appDataSource
      .getRepository(AiUserFileEntity)
      .extend(aiUserFileRepositoryExtension);
    this._companyLogoRepository = this.appDataSource.getRepository(CompanyLogoEntity);
  }

  public get userRepository(): Repository<UserEntity> & IUserRepository {
    return this._userRepository;
  }

  public get connectionRepository(): Repository<ConnectionEntity> & IConnectionRepository {
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

  public get tableActionRepository(): Repository<TableActionEntity> & ITableActionRepository {
    return this._tableActionRepository;
  }

  public get userGitHubIdentifierRepository(): IUserGitHubIdentifierRepository {
    return this._userGitHubIdentifierRepository;
  }

  public get companyInfoRepository(): Repository<CompanyInfoEntity> & ICompanyInfoRepository {
    return this._companyInfoRepository;
  }

  public get invitationInCompanyRepository(): Repository<InvitationInCompanyEntity> & IInvitationInCompanyRepository {
    return this._invitationInCompanyRepository;
  }

  public get userSessionSettingsRepository(): Repository<UserSessionSettingsEntity> & IUserSessionSettings {
    return this._userSessionSettingsRepository;
  }

  public get actionRulesRepository(): Repository<ActionRulesEntity> & IActionRulesRepository {
    return this._actionRulesRepository;
  }

  public get actionEventsRepository(): Repository<ActionEventsEntity> & IActionEventsRepository {
    return this._actionEventsRepository;
  }

  public get userApiKeysRepository(): Repository<UserApiKeyEntity> & IUserApiKeyRepository {
    return this._userApiKeysRepository;
  }

  public get aiUserThreadsRepository(): Repository<AiUserThreadEntity> & IAiUserThreadsRepository {
    return this._aiUserThreadsRepository;
  }

  public get aiUserFilesRepository(): Repository<AiUserFileEntity> & IAiUserFilesRepository {
    return this._aiUserFilesRepository;
  }

  public get companyLogoRepository(): Repository<CompanyLogoEntity> {
    return this._companyLogoRepository;
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
    }
  }

  public async rollbackTransaction(): Promise<void> {
    if (!this._queryRunner) return;
    try {
      await this._queryRunner.rollbackTransaction();
    } catch (e) {
      console.error(e);
      throw e;
    }
  }

  public async releaseQueryRunner(): Promise<void> {
    if (!this._queryRunner) return;
    await this._queryRunner.release();
  }
}
