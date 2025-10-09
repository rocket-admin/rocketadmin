import { Global, MiddlewareConsumer, Module } from '@nestjs/common';
import { BaseType } from '../../common/data-injection.tokens.js';
import { GlobalDatabaseContext } from '../../common/application/global-database-context.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SharedJobsService } from './shared-jobs.service.js';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([])],
  providers: [
    {
      provide: BaseType.GLOBAL_DB_CONTEXT,
      useClass: GlobalDatabaseContext,
    },
    SharedJobsService,
  ],
  controllers: [],
  exports: [SharedJobsService],
})
export class SharedJobsModule {
  public configure(_consumer: MiddlewareConsumer): any {}
}
