import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserSecretEntity } from './user-secret.entity.js';
import { SecretAccessLogEntity } from '../secret-access-log/secret-access-log.entity.js';
import { UserEntity } from '../user/user.entity.js';
import { UserSecretController } from './user-secret.controller.js';
import { AuthMiddleware } from '../../authorization/auth.middleware.js';
import { LogOutEntity } from '../log-out/log-out.entity.js';
import { GlobalDatabaseContext } from '../../common/application/global-database-context.js';
import { BaseType, UseCaseType } from '../../common/data-injection.tokens.js';
import { CreateSecretUseCase } from './use-cases/create-secret.use.case.js';
import { GetSecretsUseCase } from './use-cases/get-secrets.use.case.js';
import { GetSecretBySlugUseCase } from './use-cases/get-secret-by-slug.use.case.js';
import { UpdateSecretUseCase } from './use-cases/update-secret.use.case.js';
import { DeleteSecretUseCase } from './use-cases/delete-secret.use.case.js';
import { GetSecretAuditLogUseCase } from './use-cases/get-secret-audit-log.use.case.js';

@Module({
  imports: [TypeOrmModule.forFeature([UserSecretEntity, SecretAccessLogEntity, UserEntity, LogOutEntity])],
  providers: [
    {
      provide: BaseType.GLOBAL_DB_CONTEXT,
      useClass: GlobalDatabaseContext,
    },
    {
      provide: UseCaseType.CREATE_SECRET,
      useClass: CreateSecretUseCase,
    },
    {
      provide: UseCaseType.GET_SECRETS,
      useClass: GetSecretsUseCase,
    },
    {
      provide: UseCaseType.GET_SECRET_BY_SLUG,
      useClass: GetSecretBySlugUseCase,
    },
    {
      provide: UseCaseType.UPDATE_SECRET,
      useClass: UpdateSecretUseCase,
    },
    {
      provide: UseCaseType.DELETE_SECRET,
      useClass: DeleteSecretUseCase,
    },
    {
      provide: UseCaseType.GET_SECRET_AUDIT_LOG,
      useClass: GetSecretAuditLogUseCase,
    },
  ],
  controllers: [UserSecretController],
})
export class UserSecretModule implements NestModule {
  public configure(consumer: MiddlewareConsumer): void {
    consumer.apply(AuthMiddleware).forRoutes(
      {
        path: '/secrets',
        method: RequestMethod.POST,
      },
      {
        path: '/secrets',
        method: RequestMethod.GET,
      },
      {
        path: '/secrets/:slug',
        method: RequestMethod.GET,
      },
      {
        path: '/secrets/:slug',
        method: RequestMethod.PUT,
      },
      {
        path: '/secrets/:slug',
        method: RequestMethod.DELETE,
      },
      {
        path: '/secrets/:slug/audit-log',
        method: RequestMethod.GET,
      },
    );
  }
}
