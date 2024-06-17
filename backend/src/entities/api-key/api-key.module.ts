import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { ApiKeyController } from './api-key.controller.js';
import { AuthMiddleware } from '../../authorization/auth.middleware.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserApiKeyEntity } from './api-key.entity.js';
import { GlobalDatabaseContext } from '../../common/application/global-database-context.js';
import { BaseType, UseCaseType } from '../../common/data-injection.tokens.js';
import { CreateApiKeyUseCase } from './use-cases/create-api-key.use.case.js';
import { UserEntity } from '../user/user.entity.js';
import { LogOutEntity } from '../log-out/log-out.entity.js';
import { GetAllUserApiKeysUseCase } from './use-cases/get-all-user-api-keys.use.case.js';

@Module({
  imports: [TypeOrmModule.forFeature([UserApiKeyEntity, UserEntity, LogOutEntity])],
  providers: [
    {
      provide: BaseType.GLOBAL_DB_CONTEXT,
      useClass: GlobalDatabaseContext,
    },
    {
      provide: UseCaseType.CREATE_API_KEY,
      useClass: CreateApiKeyUseCase,
    },
    {
      provide: UseCaseType.GET_API_KEYS,
      useClass: GetAllUserApiKeysUseCase,
    },
  ],
  controllers: [ApiKeyController],
})
export class ApiKeyModule implements NestModule {
  public configure(consumer: MiddlewareConsumer): any {
    consumer
      .apply(AuthMiddleware)
      .forRoutes(
        { path: '/apikey', method: RequestMethod.POST },
        { path: '/apikey', method: RequestMethod.DELETE },
        { path: '/apikeys', method: RequestMethod.GET },
      );
  }
}
