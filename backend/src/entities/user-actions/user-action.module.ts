import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthMiddleware } from '../../authorization/index.js';
import { GlobalDatabaseContext } from '../../common/application/global-database-context.js';
import { BaseType, UseCaseType } from '../../common/data-injection.tokens.js';
import { LogOutEntity } from '../log-out/log-out.entity.js';
import { UserEntity } from '../user/user.entity.js';
import { CreateUserActionUseCase } from './use-cases/create-user-action.use.case.js';
import { UserActionController } from './user-action.controller.js';
import { UserActionEntity } from './user-action.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([UserActionEntity, UserEntity, LogOutEntity])],
  providers: [
    {
      provide: BaseType.GLOBAL_DB_CONTEXT,
      useClass: GlobalDatabaseContext,
    },
    {
      provide: UseCaseType.CREATE_USER_ACTION,
      useClass: CreateUserActionUseCase,
    },
  ],
  controllers: [UserActionController],
  exports: [],
})
export class UserActionModule implements NestModule {
  public configure(consumer: MiddlewareConsumer): void {
    consumer.apply(AuthMiddleware).forRoutes({
      path: 'action',
      method: RequestMethod.POST,
    });
  }
}
