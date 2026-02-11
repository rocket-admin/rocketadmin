import { Global, MiddlewareConsumer, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GlobalDatabaseContext } from '../../common/application/global-database-context.js';
import { BaseType } from '../../common/data-injection.tokens.js';
import { DemoDataService } from './demo-data.service.js';

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
