import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GlobalDatabaseContext } from '../../common/application/global-database-context.js';
import { BaseType, UseCaseType } from '../../common/data-injection.tokens.js';
import { CompanyLogoEntity } from '../company-logo/company-logo.entity.js';
import { ConnectionPropertiesEntity } from '../connection-properties/connection-properties.entity.js';
import { ConnectionEntity } from '../connection/connection.entity.js';
import { CustomFieldsEntity } from '../custom-field/custom-fields.entity.js';
import { GroupEntity } from '../group/group.entity.js';
import { LogOutEntity } from '../log-out/log-out.entity.js';
import { PermissionEntity } from '../permission/permission.entity.js';
import { TableLogsEntity } from '../table-logs/table-logs.entity.js';
import { TableSettingsEntity } from '../table-settings/table-settings.entity.js';
import { UserEntity } from '../user/user.entity.js';
import { TableWidgetEntity } from '../widget/table-widget.entity.js';
import { CompanyInfoController } from './company-info.controller.js';
import { CheckIsVerificationLinkAvailable } from './use-cases/check-verification-link.available.use.case.js';
import { DeleteCompanyFaviconUseCase } from './use-cases/delete-company-favicon.use.case.js';
import { DeleteCompanyLogoUseCase } from './use-cases/delete-company-logo.use.case.js';
import { DeleteCompanyUseCase } from './use-cases/delete-company-use-case.js';
import { FindCompanyFaviconUseCase } from './use-cases/find-company-favicon.use.case.js';
import { FindCompanyLogoUseCase } from './use-cases/find-company-logo.use.case.js';
import { GetAllUsersInCompanyUseCase } from './use-cases/get-all-users-in-company.use.case.js';
import { GetCompanyNameUseCase } from './use-cases/get-company-name.use.case.js';
import { GetUserCompanyFullInfoUseCase } from './use-cases/get-full-user-company-info.use.case.js';
import { GetUserCompanyUseCase } from './use-cases/get-user-company.use.case.js';
import { GetUserEmailCompaniesUseCase } from './use-cases/get-user-email-companies.use.case.js';
import { InviteUserInCompanyAndConnectionGroupUseCase } from './use-cases/invite-user-in-company.use.case.js';
import { RemoveUserFromCompanyUseCase } from './use-cases/remove-user-from-company.use.case.js';
import { RevokeUserInvitationInCompanyUseCase } from './use-cases/revoke-invitation-in-company.use.case.js';
import { SuspendUsersInCompanyUseCase } from './use-cases/suspend-users-in-company.use.case.js';
import { ToggleCompanyTestConnectionsDisplayModeUseCase } from './use-cases/toggle-test-connections-company-display-mode.use.case.js';
import { UnsuspendUsersInCompanyUseCase } from './use-cases/unsuspend-users-in-company.use.case.js';
import { UpdateCompanyNameUseCase } from './use-cases/update-company-name.use.case.js';
import { UpdateUsersCompanyRolesUseCase } from './use-cases/update-users-company-roles.use.case.js';
import { UpdateUses2faStatusInCompanyUseCase } from './use-cases/update-uses-2fa-status-in-company.use.case.js';
import { UploadCompanyFaviconUseCase } from './use-cases/upload-company-favicon.use.case.js';
import { UploadCompanyLogoUseCase } from './use-cases/upload-company-logo-use-case.js';
import { VerifyInviteUserInCompanyAndConnectionGroupUseCase } from './use-cases/verify-invite-user-in-company.use.case.js';
import { AuthMiddleware } from '../../authorization/auth.middleware.js';
import { AddCompanyTabTitleUseCase } from './use-cases/add-company-tab-title.use.case.js';
import { FindCompanyTabTitleUseCase } from './use-cases/find-company-tab-title.use.case.js';
import { DeleteCompanyTabTitleUseCase } from './use-cases/delete-company-tab-title.use.case.js';
import { FindCompanyWhiteLabelPropertiesUseCase } from './use-cases/find-company-white-label-properties.use.case.js';
import { CompanyInfoHelperService } from './company-info-helper.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ConnectionEntity,
      UserEntity,
      GroupEntity,
      PermissionEntity,
      TableSettingsEntity,
      TableLogsEntity,
      CustomFieldsEntity,
      TableWidgetEntity,
      ConnectionPropertiesEntity,
      CompanyLogoEntity,
      LogOutEntity,
    ]),
  ],
  providers: [
    {
      provide: BaseType.GLOBAL_DB_CONTEXT,
      useClass: GlobalDatabaseContext,
    },
    {
      provide: UseCaseType.INVITE_USER_IN_COMPANY_AND_CONNECTION_GROUP,
      useClass: InviteUserInCompanyAndConnectionGroupUseCase,
    },
    {
      provide: UseCaseType.VERIFY_INVITE_USER_IN_COMPANY_AND_CONNECTION_GROUP,
      useClass: VerifyInviteUserInCompanyAndConnectionGroupUseCase,
    },
    {
      provide: UseCaseType.GET_USER_COMPANY,
      useClass: GetUserCompanyUseCase,
    },
    {
      provide: UseCaseType.GET_FULL_USER_COMPANIES_INFO,
      useClass: GetUserCompanyFullInfoUseCase,
    },
    {
      provide: UseCaseType.GET_USER_EMAIL_COMPANIES,
      useClass: GetUserEmailCompaniesUseCase,
    },
    {
      provide: UseCaseType.GET_USERS_IN_COMPANY,
      useClass: GetAllUsersInCompanyUseCase,
    },
    {
      provide: UseCaseType.REMOVE_USER_FROM_COMPANY,
      useClass: RemoveUserFromCompanyUseCase,
    },
    {
      provide: UseCaseType.REVOKE_INVITATION_IN_COMPANY,
      useClass: RevokeUserInvitationInCompanyUseCase,
    },
    {
      provide: UseCaseType.UPDATE_COMPANY_NAME,
      useClass: UpdateCompanyNameUseCase,
    },
    {
      provide: UseCaseType.GET_COMPANY_NAME,
      useClass: GetCompanyNameUseCase,
    },
    {
      provide: UseCaseType.UPDATE_USERS_COMPANY_ROLES,
      useClass: UpdateUsersCompanyRolesUseCase,
    },
    {
      provide: UseCaseType.DELETE_COMPANY,
      useClass: DeleteCompanyUseCase,
    },
    {
      provide: UseCaseType.CHECK_IS_VERIFICATION_LINK_AVAILABLE,
      useClass: CheckIsVerificationLinkAvailable,
    },
    {
      provide: UseCaseType.UPDATE_USERS_2FA_STATUS_IN_COMPANY,
      useClass: UpdateUses2faStatusInCompanyUseCase,
    },
    {
      provide: UseCaseType.SUSPEND_USERS_IN_COMPANY,
      useClass: SuspendUsersInCompanyUseCase,
    },
    {
      provide: UseCaseType.UNSUSPEND_USERS_IN_COMPANY,
      useClass: UnsuspendUsersInCompanyUseCase,
    },
    {
      provide: UseCaseType.TOGGLE_TEST_CONNECTIONS_DISPLAY_MODE_IN_COMPANY,
      useClass: ToggleCompanyTestConnectionsDisplayModeUseCase,
    },
    {
      provide: UseCaseType.UPLOAD_COMPANY_LOGO,
      useClass: UploadCompanyLogoUseCase,
    },
    {
      provide: UseCaseType.FIND_COMPANY_LOGO,
      useClass: FindCompanyLogoUseCase,
    },
    {
      provide: UseCaseType.DELETE_COMPANY_LOGO,
      useClass: DeleteCompanyLogoUseCase,
    },
    {
      provide: UseCaseType.DELETE_COMPANY_FAVICON,
      useClass: DeleteCompanyFaviconUseCase,
    },
    {
      provide: UseCaseType.FIND_COMPANY_FAVICON,
      useClass: FindCompanyFaviconUseCase,
    },
    {
      provide: UseCaseType.UPLOAD_COMPANY_FAVICON,
      useClass: UploadCompanyFaviconUseCase,
    },
    {
      provide: UseCaseType.ADD_COMPANY_TAB_TITLE,
      useClass: AddCompanyTabTitleUseCase,
    },
    {
      provide: UseCaseType.FIND_COMPANY_TAB_TITLE,
      useClass: FindCompanyTabTitleUseCase,
    },
    {
      provide: UseCaseType.DELETE_COMPANY_TAB_TITLE,
      useClass: DeleteCompanyTabTitleUseCase,
    },
    {
      provide: UseCaseType.GET_COMPANY_WHITE_LABEL_PROPERTIES,
      useClass: FindCompanyWhiteLabelPropertiesUseCase,
    },
    CompanyInfoHelperService,
  ],
  controllers: [CompanyInfoController],
})
export class CompanyInfoModule implements NestModule {
  public configure(consumer: MiddlewareConsumer): any {
    consumer
      .apply(AuthMiddleware)
      .forRoutes(
        { path: '/company/user/:companyId', method: RequestMethod.PUT },
        { path: '/company/my', method: RequestMethod.GET },
        { path: '/company/my', method: RequestMethod.DELETE },
        { path: '/company/my/full', method: RequestMethod.GET },
        { path: '/company/users/:companyId', method: RequestMethod.GET },
        { path: '/company/:companyId/user/:userId', method: RequestMethod.DELETE },
        { path: '/company/invitation/revoke/:companyId', method: RequestMethod.PUT },
        { path: '/company/name/:companyId', method: RequestMethod.PUT },
        { path: '/company/users/roles/:companyId', method: RequestMethod.PUT },
        { path: '/company/2fa/:companyId', method: RequestMethod.PUT },
        { path: '/company/users/suspend/:companyId', method: RequestMethod.PUT },
        { path: '/company/users/unsuspend/:companyId', method: RequestMethod.PUT },
        { path: '/company/connections/display/', method: RequestMethod.PUT },
        { path: '/company/logo/:companyId', method: RequestMethod.POST },
        { path: '/company/logo/:companyId', method: RequestMethod.GET },
        { path: '/company/logo/:companyId', method: RequestMethod.DELETE },
        { path: '/company/favicon/:companyId', method: RequestMethod.POST },
        { path: '/company/favicon/:companyId', method: RequestMethod.GET },
        { path: '/company/favicon/:companyId', method: RequestMethod.DELETE },
        { path: '/company/tab-title/:companyId', method: RequestMethod.POST },
        { path: '/company/tab-title/:companyId', method: RequestMethod.GET },
        { path: '/company/tab-title/:companyId', method: RequestMethod.DELETE },
        { path: '/company/white-label-properties/:companyId', method: RequestMethod.GET },
      );
  }
}
