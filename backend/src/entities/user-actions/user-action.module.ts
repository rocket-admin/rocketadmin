import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthMiddleware } from '../../authorization';
import { GlobalDatabaseContext } from '../../common/application/global-database-context';
import { BaseType, UseCaseType } from '../../common/data-injection.tokens';
import { LogOutEntity } from '../log-out/log-out.entity';
import { UserEntity } from '../user/user.entity';
import { CreateUserActionUseCase } from './use-cases/create-user-action.use.case';
import { UserActionController } from './user-action.controller';
import { UserActionEntity } from './user-action.entity';

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
