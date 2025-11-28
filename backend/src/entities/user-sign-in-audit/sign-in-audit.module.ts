import { Global, MiddlewareConsumer, Module, RequestMethod } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthMiddleware } from '../../authorization/index.js';
import { GlobalDatabaseContext } from '../../common/application/global-database-context.js';
import { BaseType, UseCaseType } from '../../common/data-injection.tokens.js';
import { LogOutEntity } from '../log-out/log-out.entity.js';
import { UserEntity } from '../user/user.entity.js';
import { SignInAuditController } from './sign-in-audit.controller.js';
import { SignInAuditEntity } from './sign-in-audit.entity.js';
import { SignInAuditService } from './sign-in-audit.service.js';
import { FindSignInAuditLogsUseCase } from './use-cases/find-sign-in-audit-logs.use.case.js';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([SignInAuditEntity, UserEntity, LogOutEntity])],
  providers: [
    {
      provide: BaseType.GLOBAL_DB_CONTEXT,
      useClass: GlobalDatabaseContext,
    },
    {
      provide: UseCaseType.FIND_SIGN_IN_AUDIT_LOGS,
      useClass: FindSignInAuditLogsUseCase,
    },
    SignInAuditService,
  ],
  controllers: [SignInAuditController],
  exports: [SignInAuditService],
})
export class SignInAuditModule {
  public configure(consumer: MiddlewareConsumer): any {
    consumer.apply(AuthMiddleware).forRoutes({ path: '/sign-in-audit/logs', method: RequestMethod.GET });
  }
}
