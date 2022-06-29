import { AgentModule } from '../agent/agent.module';
import { AuthMiddleware } from '../../authorization';
import { ConnectionEntity } from '../connection/connection.entity';
import { CustomFieldsEntity } from '../custom-field/custom-fields.entity';
import { GroupEntity } from '../group/group.entity';
import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { PermissionEntity } from '../permission/permission.entity';
import { TableLogsEntity } from '../table-logs/table-logs.entity';
import { TableSettingsEntity } from '../table-settings/table-settings.entity';
import { TableWidgetEntity } from '../widget/table-widget.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserController } from './user.controller';
import { UserEntity } from './user.entity';
import { ConnectionPropertiesEntity } from '../connection-properties/connection-properties.entity';
import { UserRepository } from './repository/user.repository';
import { BaseType, UseCaseType } from '../../common/data-injection.tokens';
import { GlobalDatabaseContext } from '../../common/application/global-database-context';
import { FindUserUseCase } from './use-cases/find-user-use.case';
import { UpgradeSubscriptionUseCase } from './use-cases/upgrade-subscription.use.case';
import { UsualLoginUseCase } from './use-cases/usual-login-use.case';
import { UsualRegisterUseCase } from './use-cases/usual-register-use.case';
import { LogOutUseCase } from './use-cases/log-out.use.case';
import { GoogleLoginUseCase } from './use-cases/google-login-use.case';
import { FacebookLoginUseCase } from './use-cases/facebook-login.use.case';
import { ChangeUsualPasswordUseCase } from './use-cases/change-usual-password-use.case';
import { VerifyUserEmailUseCase } from './use-cases/verify-user-email.use.case';
import { VerifyResetUserPasswordUseCase } from './use-cases/verify-reset-user-password.use.case';
import { RequestResetUserPasswordUseCase } from './use-cases/request-reset-user-password.use.case';
import { RequestChangeUserEmailUseCase } from './use-cases/request-change-user-email.use.case';
import { VerifyChangeUserEmailUseCase } from './use-cases/verify-change-user-email.use.case';
import { RequestEmailVerificationUseCase } from './use-cases/request-email-verification.use.case';
import { DeleteUserAccountUseCase } from './use-cases/delete-user-account-use-case.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ConnectionEntity,
      CustomFieldsEntity,
      GroupEntity,
      PermissionEntity,
      TableLogsEntity,
      TableSettingsEntity,
      TableWidgetEntity,
      UserEntity,
      ConnectionPropertiesEntity,
    ]),
    AgentModule,
  ],
  providers: [
    UserRepository,
    {
      provide: BaseType.GLOBAL_DB_CONTEXT,
      useClass: GlobalDatabaseContext,
    },
    {
      provide: UseCaseType.FIND_USER,
      useClass: FindUserUseCase,
    },
    {
      provide: UseCaseType.UPGRADE_USER_SUBSCRIPTION,
      useClass: UpgradeSubscriptionUseCase,
    },
    {
      provide: UseCaseType.USUAL_LOGIN,
      useClass: UsualLoginUseCase,
    },
    {
      provide: UseCaseType.USUAL_REGISTER,
      useClass: UsualRegisterUseCase,
    },
    {
      provide: UseCaseType.LOG_OUT,
      useClass: LogOutUseCase,
    },
    {
      provide: UseCaseType.GOOGLE_LOGIN,
      useClass: GoogleLoginUseCase,
    },
    {
      provide: UseCaseType.FACEBOOK_LOGIN,
      useClass: FacebookLoginUseCase,
    },
    {
      provide: UseCaseType.CHANGE_USUAL_PASSWORD,
      useClass: ChangeUsualPasswordUseCase,
    },
    {
      provide: UseCaseType.VERIFY_EMAIL,
      useClass: VerifyUserEmailUseCase,
    },
    {
      provide: UseCaseType.VERIFY_RESET_USER_PASSWORD,
      useClass: VerifyResetUserPasswordUseCase,
    },
    {
      provide: UseCaseType.REQUEST_RESET_USER_PASSWORD,
      useClass: RequestResetUserPasswordUseCase,
    },
    {
      provide: UseCaseType.REQUEST_CHANGE_USER_EMAIL,
      useClass: RequestChangeUserEmailUseCase,
    },
    {
      provide: UseCaseType.VERIFY_EMAIL_CHANGE,
      useClass: VerifyChangeUserEmailUseCase,
    },
    {
      provide: UseCaseType.VERIFY_EMAIL_REQUEST,
      useClass: RequestEmailVerificationUseCase,
    },
    {
      provide: UseCaseType.DELETE_USER_ACCOUNT,
      useClass: DeleteUserAccountUseCase,
    },
  ],
  controllers: [UserController],
  exports: [],
})
export class UserModule implements NestModule {
  public configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(AuthMiddleware)
      .forRoutes(
        { path: 'user', method: RequestMethod.GET },
        { path: 'user', method: RequestMethod.PUT },
        { path: 'user/permissions/:slug', method: RequestMethod.GET },
        { path: 'user/subscription/upgrade', method: RequestMethod.POST },
        { path: 'user/logout/', method: RequestMethod.POST },
        { path: 'user/email/verify/request', method: RequestMethod.GET },
        { path: 'user/delete/', method: RequestMethod.PUT },
        { path: 'user/email/change/request', method: RequestMethod.GET },
      );
  }
}
