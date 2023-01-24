import { BasicAuthMiddleware } from '../../authorization/index.js';
import { ConnectionEntity } from '../connection/connection.entity.js';
import { ConversionController } from './conversion.controller.js';
import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from '../user/user.entity.js';
import { TableLogsEntity } from '../table-logs/table-logs.entity.js';
import { GetConversionsUseCase } from './use-cases/get-conversions.use.case.js';
import { GlobalDatabaseContext } from '../../common/application/global-database-context.js';
import { BaseType, UseCaseType } from '../../common/data-injection.tokens.js';

@Module({
  imports: [TypeOrmModule.forFeature([ConnectionEntity, UserEntity, TableLogsEntity])],
  providers: [
    {
      provide: BaseType.GLOBAL_DB_CONTEXT,
      useClass: GlobalDatabaseContext,
    },
    {
      provide: UseCaseType.GET_CONVERSIONS,
      useClass: GetConversionsUseCase,
    },
  ],
  controllers: [ConversionController],
})
export class ConversionModule implements NestModule {
  public configure(consumer: MiddlewareConsumer): any {
    consumer.apply(BasicAuthMiddleware).forRoutes({ path: '/conversions', method: RequestMethod.GET });
  }
}
