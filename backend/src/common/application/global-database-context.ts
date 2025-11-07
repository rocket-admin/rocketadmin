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
import { tableSettingsCustomRepositoryExtension } from '../../entities/table-settings/common-table-settings/repository/table-settings-custom-repository-extension.js';
import { ITableSettingsRepository } from '../../entities/table-settings/common-table-settings/repository/table-settings.repository.interface.js';
import { TableSettingsEntity } from '../../entities/table-settings/common-table-settings/table-settings.entity.js';
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
import { CompanyLogoEntity } from '../../entities/company-logo/company-logo.entity.js';
import { CompanyFaviconEntity } from '../../entities/company-favicon/company-favicon.entity.js';
import { CompanyTabTitleEntity } from '../../entities/company-tab-title/company-tab-title.entity.js';
import { TableFiltersEntity } from '../../entities/table-filters/table-filters.entity.js';
import { ITableFiltersCustomRepository } from '../../entities/table-filters/repository/table-filters-custom-repository.interface.js';
import { tableFiltersCustomRepositoryExtension } from '../../entities/table-filters/repository/table-filters-custom-repository-extension.js';
import { IAiResponsesToUserRepository } from '../../entities/ai/ai-data-entities/ai-reponses-to-user/ai-responses-to-user-repository.interface.js';
import { AiResponsesToUserEntity } from '../../entities/ai/ai-data-entities/ai-reponses-to-user/ai-responses-to-user.entity.js';
import { aiResponsesToUserRepositoryExtension } from '../../entities/ai/ai-data-entities/ai-reponses-to-user/ai-reponses-to-user-repository.extension.js';
import { TableCategoriesEntity } from '../../entities/table-categories/table-categories.entity.js';
import { ITableCategoriesCustomRepository } from '../../entities/table-categories/repository/table-categories-repository.interface.js';
import { tableCategoriesCustomRepositoryExtension } from '../../entities/table-categories/repository/table-categories-repository.extension.js';
import { PersonalTableSettingsEntity } from '../../entities/table-settings/personal-table-settings/personal-table-settings.entity.js';
import { IPersonalTableSettingsRepository } from '../../entities/table-settings/personal-table-settings/repository/personal-table-settings.repository.interface.js';
import { personalTableSettingsCustomRepositoryExtension } from '../../entities/table-settings/personal-table-settings/repository/personal-table-settings-custom-repository-extension.js';

@Injectable({ scope: Scope.REQUEST })
export class GlobalDatabaseContext implements IGlobalDatabaseContext {
  private _queryRunner: QueryRunner;

  private _userRepository: Repository<UserEntity> & IUserRepository;
  private _connectionRepository: Repository<ConnectionEntity> & IConnectionRepository;
  private _groupRepository: IGroupRepository;
  private _permissionRepository: IPermissionRepository;
  private _tableSettingsRepository: Repository<TableSettingsEntity> & ITableSettingsRepository;
  private _userAccessRepository: IUserAccessRepository;
  private _agentRepository: IAgentRepository;
  private _emailVerificationRepository: IEmailVerificationRepository;
  private _passwordResetRepository: IPasswordResetRepository;
  private _emailChangeRepository: IEmailChangeRepository;
  private _userInvitationRepository: IUserInvitationRepository;
  private _connectionPropertiesRepository: Repository<ConnectionPropertiesEntity> & IConnectionPropertiesRepository;
  private _customFieldsRepository: ICustomFieldsRepository;
  private _tableLogsRepository: ITableLogsRepository;
  private _userActionRepository: IUserActionRepository;
  private _logOutRepository: ILogOutRepository;
  private _tableWidgetsRepository: Repository<TableWidgetEntity> & ITableWidgetsRepository;
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
  private _companyLogoRepository: Repository<CompanyLogoEntity>;
  private _companyFaviconRepository: Repository<CompanyFaviconEntity>;
  private _companyTabTitleRepository: Repository<CompanyTabTitleEntity>;
  private _tableFiltersRepository: Repository<TableFiltersEntity> & ITableFiltersCustomRepository;
  private _aiResponsesToUserRepository: Repository<AiResponsesToUserEntity> & IAiResponsesToUserRepository;
  private _tableCategoriesRepository: Repository<TableCategoriesEntity> & ITableCategoriesCustomRepository;
  private _personalTableSettingsRepository: Repository<PersonalTableSettingsEntity> & IPersonalTableSettingsRepository;

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
    this._companyLogoRepository = this.appDataSource.getRepository(CompanyLogoEntity);
    this._companyFaviconRepository = this.appDataSource.getRepository(CompanyFaviconEntity);
    this._companyTabTitleRepository = this.appDataSource.getRepository(CompanyTabTitleEntity);
    this._tableFiltersRepository = this.appDataSource
      .getRepository(TableFiltersEntity)
      .extend(tableFiltersCustomRepositoryExtension);
    this._aiResponsesToUserRepository = this.appDataSource
      .getRepository(AiResponsesToUserEntity)
      .extend(aiResponsesToUserRepositoryExtension);
    this._tableCategoriesRepository = this.appDataSource
      .getRepository(TableCategoriesEntity)
      .extend(tableCategoriesCustomRepositoryExtension);
    this._personalTableSettingsRepository = this.appDataSource
      .getRepository(PersonalTableSettingsEntity)
      .extend(personalTableSettingsCustomRepositoryExtension);
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

  public get tableSettingsRepository(): Repository<TableSettingsEntity> & ITableSettingsRepository {
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

  public get connectionPropertiesRepository(): Repository<ConnectionPropertiesEntity> &
    IConnectionPropertiesRepository {
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

  public get tableWidgetsRepository(): Repository<TableWidgetEntity> & ITableWidgetsRepository {
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

  public get companyLogoRepository(): Repository<CompanyLogoEntity> {
    return this._companyLogoRepository;
  }

  public get companyFaviconRepository(): Repository<CompanyFaviconEntity> {
    return this._companyFaviconRepository;
  }

  public get companyTabTitleRepository(): Repository<CompanyTabTitleEntity> {
    return this._companyTabTitleRepository;
  }

  public get tableFiltersRepository(): Repository<TableFiltersEntity> & ITableFiltersCustomRepository {
    return this._tableFiltersRepository;
  }

  public get aiResponsesToUserRepository(): Repository<AiResponsesToUserEntity> & IAiResponsesToUserRepository {
    return this._aiResponsesToUserRepository;
  }

  public get tableCategoriesRepository(): Repository<TableCategoriesEntity> & ITableCategoriesCustomRepository {
    return this._tableCategoriesRepository;
  }

  public get personalTableSettingsRepository(): Repository<PersonalTableSettingsEntity> &
    IPersonalTableSettingsRepository {
    return this._personalTableSettingsRepository;
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
