import { Global, MiddlewareConsumer, Module } from '@nestjs/common';
import { DemoDataService } from './demo-data.service.js';
import { BaseType } from '../../common/data-injection.tokens.js';
import { GlobalDatabaseContext } from '../../common/application/global-database-context.js';
import { TypeOrmModule } from '@nestjs/typeorm';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([])],
  providers: [
    {
      provide: BaseType.GLOBAL_DB_CONTEXT,
      useClass: GlobalDatabaseContext,
    },

    DemoDataService,
  ],
  controllers: [],
  exports: [DemoDataService],
})
export class DemoDataModule {
  public configure(_consumer: MiddlewareConsumer): any {}
}
