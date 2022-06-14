import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserActionEntity } from './user-action.entity';
import { UserEntity } from '../user/user.entity';
import { UserActionController } from './user-action.controller';
import { AuthMiddleware } from '../../authorization';
import { BaseType, UseCaseType } from '../../common/data-injection.tokens';
import { GlobalDatabaseContext } from '../../common/application/global-database-context';
import { CreateUserActionUseCase } from './use-cases/create-user-action.use.case';

@Module({
  imports: [TypeOrmModule.forFeature([UserActionEntity, UserEntity])],
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
