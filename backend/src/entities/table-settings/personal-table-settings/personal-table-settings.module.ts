import { MiddlewareConsumer, Module, RequestMethod } from '@nestjs/common';
import { GlobalDatabaseContext } from '../../../common/application/global-database-context.js';
import { BaseType, UseCaseType } from '../../../common/data-injection.tokens.js';
import { FindPersonalTableSettingsUseCase } from './use-cases/find-personal-table-settings.use.case.js';
import { CreateUpdatePersonalTableSettingsUseCase } from './use-cases/create-update-personal-table-settings.use.case.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PersonalTableSettingsController } from './personal-table-settings.controller.js';
import { AuthMiddleware } from '../../../authorization/auth.middleware.js';
import { UserEntity } from '../../user/user.entity.js';
import { LogOutEntity } from '../../log-out/log-out.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([UserEntity, LogOutEntity])],
  providers: [
    {
      provide: BaseType.GLOBAL_DB_CONTEXT,
      useClass: GlobalDatabaseContext,
    },
    {
      provide: UseCaseType.FIND_PERSONAL_TABLE_SETTINGS,
      useClass: FindPersonalTableSettingsUseCase,
    },
    {
      provide: UseCaseType.CREATE_UPDATE_PERSONAL_TABLE_SETTINGS,
      useClass: CreateUpdatePersonalTableSettingsUseCase,
    },
    {
      provide: UseCaseType.DELETE_PERSONAL_TABLE_SETTINGS,
      useClass: CreateUpdatePersonalTableSettingsUseCase,
    },
  ],
  controllers: [PersonalTableSettingsController],
  exports: [],
})
export class PersonalTableSettingsModule {
  public configure(consumer: MiddlewareConsumer): any {
    consumer
      .apply(AuthMiddleware)
      .forRoutes(
        { path: '/settings/personal/:connectionId', method: RequestMethod.GET },
        { path: '/settings/personal/:connectionId', method: RequestMethod.PUT },
        { path: '/settings/personal/:connectionId', method: RequestMethod.DELETE },
      );
  }
}
