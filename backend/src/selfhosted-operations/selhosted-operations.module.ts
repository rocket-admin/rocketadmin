import { DynamicModule, MiddlewareConsumer, Module, RequestMethod } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthMiddleware } from '../authorization/auth.middleware.js';
import { GlobalDatabaseContext } from '../common/application/global-database-context.js';
import { BaseType, UseCaseType } from '../common/data-injection.tokens.js';
import { CompanyInfoEntity } from '../entities/company-info/company-info.entity.js';
import { LogOutEntity } from '../entities/log-out/log-out.entity.js';
import { UserEntity } from '../entities/user/user.entity.js';
import { isSaaS } from '../helpers/app/is-saas.js';
import { CreateInitialUserUseCase } from './application/use-cases/create-initial-user.use.case.js';
import { IsConfiguredUseCase } from './application/use-cases/is-configured.use.case.js';
import { UpdateUserEmailAsAdminUseCase } from './application/use-cases/update-user-email-as-admin.use.case.js';
import { UpdateUserPasswordAsAdminUseCase } from './application/use-cases/update-user-password-as-admin.use.case.js';
import { SelfHostedOperationsController } from './selfhosted-operations.controller.js';

@Module({})
export class SelfHostedOperationsModule {
	// Whether register() built the full (self-hosted) module. configure() must
	// follow THIS decision, not re-read isSaaS(): register() runs at import
	// time and configure() at app init — a process that flips IS_SAAS in
	// between (the in-process test apps do) would otherwise apply
	// AuthMiddleware inside the empty module variant, whose TypeORM
	// repositories were never imported, and crash the boot on DI resolution.
	private static registeredSelfHosted = false;

	static register(): DynamicModule {
		if (isSaaS()) {
			// Return empty module in SaaS mode
			SelfHostedOperationsModule.registeredSelfHosted = false;
			return {
				module: SelfHostedOperationsModule,
				imports: [],
				controllers: [],
				providers: [],
			};
		}
		SelfHostedOperationsModule.registeredSelfHosted = true;

		return {
			module: SelfHostedOperationsModule,
			imports: [TypeOrmModule.forFeature([UserEntity, CompanyInfoEntity, LogOutEntity])],
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
				{
					provide: UseCaseType.SELFHOSTED_UPDATE_USER_PASSWORD,
					useClass: UpdateUserPasswordAsAdminUseCase,
				},
				{
					provide: UseCaseType.SELFHOSTED_UPDATE_USER_EMAIL,
					useClass: UpdateUserEmailAsAdminUseCase,
				},
			],
		};
	}

	// Plan 15 Phase 6: unlike the public bootstrap routes (`/is-configured`, `/initial-user`),
	// the admin user-management routes require cookie auth (+ CompanyAdminGuard on the
	// controller). Skipped in SaaS mode: the module is empty there (no controller, and the
	// middleware's repositories are not imported), so the routes 404.
	public configure(consumer: MiddlewareConsumer): void {
		if (!SelfHostedOperationsModule.registeredSelfHosted) {
			return;
		}
		consumer
			.apply(AuthMiddleware)
			.forRoutes(
				{ path: '/selfhosted/users/:userId/password', method: RequestMethod.PUT },
				{ path: '/selfhosted/users/:userId/email', method: RequestMethod.PUT },
			);
	}
}
