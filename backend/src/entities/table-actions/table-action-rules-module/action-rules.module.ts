import { TypeOrmModule } from '@nestjs/typeorm';
import { GlobalDatabaseContext } from '../../../common/application/global-database-context.js';
import { BaseType, UseCaseType } from '../../../common/data-injection.tokens.js';
import { ActionRulesController } from './action-rules.controller.js';
import { MiddlewareConsumer, Module, RequestMethod } from '@nestjs/common';
import { AuthMiddleware } from '../../../authorization/auth.middleware.js';
import { ActionRulesEntity } from './action-rules.entity.js';
import { UserEntity } from '../../user/user.entity.js';
import { LogOutEntity } from '../../log-out/log-out.entity.js';
import { CreateActionRuleUseCase } from './use-cases/create-action-rule.use.case.js';

@Module({
  imports: [TypeOrmModule.forFeature([ActionRulesEntity, UserEntity, LogOutEntity])],
  providers: [
    {
      provide: BaseType.GLOBAL_DB_CONTEXT,
      useClass: GlobalDatabaseContext,
    },
    {
      provide: UseCaseType.CREATE_ACTION_RULES,
      useClass: CreateActionRuleUseCase,
    },
  ],
  controllers: [ActionRulesController],
})
export class TableTriggersModule {
  public configure(consumer: MiddlewareConsumer): any {
    consumer
      .apply(AuthMiddleware)
      .forRoutes(
        { path: '/table/triggers/:connectionId', method: RequestMethod.POST },
      );
  }
}
