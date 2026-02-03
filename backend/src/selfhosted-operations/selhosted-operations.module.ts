import { DynamicModule, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from '../entities/user/user.entity.js';
import { CompanyInfoEntity } from '../entities/company-info/company-info.entity.js';
import { SelfHostedOperationsController } from './selfhosted-operations.controller.js';
import { GlobalDatabaseContext } from '../common/application/global-database-context.js';
import { BaseType, UseCaseType } from '../common/data-injection.tokens.js';
import { IsConfiguredUseCase } from './application/use-cases/is-configured.use.case.js';
import { CreateInitialUserUseCase } from './application/use-cases/create-initial-user.use.case.js';
import { isSaaS } from '../helpers/app/is-saas.js';

@Module({})
export class SelfHostedOperationsModule {
	static register(): DynamicModule {
		if (isSaaS()) {
			// Return empty module in SaaS mode
			return {
				module: SelfHostedOperationsModule,
				imports: [],
				controllers: [],
				providers: [],
			};
		}

		return {
			module: SelfHostedOperationsModule,
			imports: [TypeOrmModule.forFeature([UserEntity, CompanyInfoEntity])],
			controllers: [SelfHostedOperationsController],
			providers: [
				{
					provide: BaseType.GLOBAL_DB_CONTEXT,
					useClass: GlobalDatabaseContext,
				},
				{
					provide: UseCaseType.IS_CONFIGURED,
					useClass: IsConfiguredUseCase,
				},
				{
					provide: UseCaseType.CREATE_INITIAL_USER,
					useClass: CreateInitialUserUseCase,
				},
			],
		};
	}
}
