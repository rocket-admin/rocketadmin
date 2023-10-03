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
  ],
  controllers: [CompanyInfoController],
})
export class CompanyInfoModule implements NestModule {
  public configure(consumer: MiddlewareConsumer): any {
    consumer.apply(AuthMiddleware).forRoutes({
      path: '/company/user/:slug',
      method: RequestMethod.PUT,
    });
  }
}
