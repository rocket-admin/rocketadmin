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
import { GetUserApiKeyUseCase } from './use-cases/get-user-api-key.use.case.js';
import { DeleteApiKeyUseCase } from './use-cases/delete-api-key.use.case.js';
import { AuthWithApiMiddleware } from '../../authorization/auth-with-api.middleware.js';

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
    {
      provide: UseCaseType.GET_API_KEY,
      useClass: GetUserApiKeyUseCase,
    },
    {
      provide: UseCaseType.DELETE_API_KEY,
      useClass: DeleteApiKeyUseCase,
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
        { path: '/apikey/:apiKeyId', method: RequestMethod.DELETE },
        { path: '/apikey', method: RequestMethod.PUT },
        { path: '/apikeys', method: RequestMethod.GET },
        { path: '/apikey/:apiKeyId', method: RequestMethod.GET },
      )
      .apply(AuthWithApiMiddleware)
      .forRoutes({ path: '/check/apikey', method: RequestMethod.GET });
  }
}
