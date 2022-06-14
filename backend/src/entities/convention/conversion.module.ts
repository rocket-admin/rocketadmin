import { BasicAuthMiddleware } from '../../authorization';
import { ConnectionEntity } from '../connection/connection.entity';
import { ConversionController } from './conversion.controller';
import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from '../user/user.entity';
import { TableLogsEntity } from '../table-logs/table-logs.entity';
import { GetConversionsUseCase } from './use-cases/get-conversions.use.case';
import { GlobalDatabaseContext } from '../../common/application/global-database-context';
import { BaseType, UseCaseType } from '../../common/data-injection.tokens';

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
