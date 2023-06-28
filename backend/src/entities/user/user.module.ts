import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthMiddleware } from '../../authorization/index.js';
import { GlobalDatabaseContext } from '../../common/application/global-database-context.js';
import { BaseType, UseCaseType } from '../../common/data-injection.tokens.js';
import { AgentModule } from '../agent/agent.module.js';
import { ConnectionPropertiesEntity } from '../connection-properties/connection-properties.entity.js';
import { ConnectionEntity } from '../connection/connection.entity.js';
import { CustomFieldsEntity } from '../custom-field/custom-fields.entity.js';
import { GroupEntity } from '../group/group.entity.js';
import { LogOutEntity } from '../log-out/log-out.entity.js';
import { PermissionEntity } from '../permission/permission.entity.js';
import { TableLogsEntity } from '../table-logs/table-logs.entity.js';
import { TableSettingsEntity } from '../table-settings/table-settings.entity.js';
import { TableWidgetEntity } from '../widget/table-widget.entity.js';
import { ChangeUserNameUseCase } from './use-cases/change-user-name-use.case.js';
import { ChangeUsualPasswordUseCase } from './use-cases/change-usual-password-use.case.js';
import { DeleteUserAccountUseCase } from './use-cases/delete-user-account-use-case.js';
import { FacebookLoginUseCase } from './use-cases/facebook-login.use.case.js';
import { FindUserUseCase } from './use-cases/find-user-use.case.js';
import { GoogleLoginUseCase } from './use-cases/google-login-use.case.js';
import { LogOutUseCase } from './use-cases/log-out.use.case.js';
import { RequestChangeUserEmailUseCase } from './use-cases/request-change-user-email.use.case.js';
import { RequestEmailVerificationUseCase } from './use-cases/request-email-verification.use.case.js';
import { RequestResetUserPasswordUseCase } from './use-cases/request-reset-user-password.use.case.js';
import { UpgradeSubscriptionUseCase } from './use-cases/upgrade-subscription.use.case.js';
import { UsualLoginUseCase } from './use-cases/usual-login-use.case.js';
import { UsualRegisterUseCase } from './use-cases/usual-register-use.case.js';
import { VerifyChangeUserEmailUseCase } from './use-cases/verify-change-user-email.use.case.js';
import { VerifyResetUserPasswordUseCase } from './use-cases/verify-reset-user-password.use.case.js';
import { VerifyUserEmailUseCase } from './use-cases/verify-user-email.use.case.js';
import { UserHelperService } from './user-helper.service.js';
import { UserController } from './user.controller.js';
import { UserEntity } from './user.entity.js';
import { GenerateOtpUseCase } from './use-cases/generate-otp-use.case.js';
import { VerifyOtpUseCase } from './use-cases/verify-otp-use.case.js';
import { OtpLoginUseCase } from './use-cases/otp-login-use.case.js';
import { TemporaryAuthMiddleware } from '../../authorization/temporary-auth.middleware.js';
import { DisableOtpUseCase } from './use-cases/disable-otp.use.case.js';

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
      LogOutEntity,
    ]),
    AgentModule,
  ],
  providers: [
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
    {
      provide: UseCaseType.CHANGE_USER_NAME,
      useClass: ChangeUserNameUseCase,
    },
    {
      provide: UseCaseType.GENERATE_OTP,
      useClass: GenerateOtpUseCase,
    },
    {
      provide: UseCaseType.VERIFY_OTP,
      useClass: VerifyOtpUseCase,
    },
    {
      provide: UseCaseType.OTP_LOGIN,
      useClass: OtpLoginUseCase,
    },
    {
      provide: UseCaseType.DISABLE_OTP,
      useClass: DisableOtpUseCase,
    },
    UserHelperService,
  ],
  controllers: [UserController],
  exports: [UserHelperService],
})
export class UserModule implements NestModule {
  public configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(AuthMiddleware)
      .forRoutes(
        { path: 'user', method: RequestMethod.GET },
        { path: 'user', method: RequestMethod.PUT },
        { path: 'user/name/', method: RequestMethod.PUT },
        { path: 'user/permissions/:slug', method: RequestMethod.GET },
        { path: 'user/subscription/upgrade', method: RequestMethod.POST },
        { path: 'user/logout/', method: RequestMethod.POST },
        { path: 'user/email/verify/request', method: RequestMethod.GET },
        { path: 'user/delete/', method: RequestMethod.PUT },
        { path: 'user/email/change/request', method: RequestMethod.GET },
        { path: 'user/otp/generate', method: RequestMethod.POST },
        { path: 'user/otp/verify', method: RequestMethod.POST },
        { path: 'user/otp/disable', method: RequestMethod.POST },
      )
      .apply(TemporaryAuthMiddleware)
      .forRoutes({ path: 'user/otp/login', method: RequestMethod.POST });
  }
}
