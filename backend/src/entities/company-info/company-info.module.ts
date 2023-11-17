import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { AuthMiddleware } from '../../authorization/auth.middleware.js';
import { GlobalDatabaseContext } from '../../common/application/global-database-context.js';
import { BaseType, UseCaseType } from '../../common/data-injection.tokens.js';
import { InviteUserInCompanyAndConnectionGroupUseCase } from './use-cases/invite-user-in-company.use.case.js';
import { VerifyInviteUserInCompanyAndConnectionGroupUseCase } from './use-cases/verify-invite-user-in-company.use.case.js';
import { TypeOrmModule } from '@nestjs/typeorm';
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
import { GetUserCompanyUseCase } from './use-cases/get-user-company.use.case.js';
import { GetUserCompanyFullInfoUseCase } from './use-cases/get-full-user-company-info.use.case.js';
import { GetUserEmailCompaniesUseCase } from './use-cases/get-user-email-companies.use.case.js';
import { GetAllUsersInCompanyUseCase } from './use-cases/get-all-users-in-company.use.case.js';
import { RemoveUserFromCompanyUseCase } from './use-cases/remove-user-from-company.use.case.js';
import { RevokeUserInvitationInCompanyUseCase } from './use-cases/revoke-invitation-in-company.use.case.js';

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
  ],
  controllers: [CompanyInfoController],
})
export class CompanyInfoModule implements NestModule {
  public configure(consumer: MiddlewareConsumer): any {
    consumer
      .apply(AuthMiddleware)
      .forRoutes(
        { path: '/company/user/:slug', method: RequestMethod.PUT },
        { path: '/company/my', method: RequestMethod.GET },
        { path: 'company/my/full', method: RequestMethod.GET },
        { path: '/company/users/:slug', method: RequestMethod.GET },
        { path: '/company/user/remove/:slug', method: RequestMethod.PUT },
        { path: '/company/invitation/revoke/:slug', method: RequestMethod.PUT },
      );
  }
}
