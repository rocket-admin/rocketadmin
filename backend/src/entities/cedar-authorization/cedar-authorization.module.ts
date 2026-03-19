import { Global, MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthMiddleware } from '../../authorization/auth.middleware.js';
import { GlobalDatabaseContext } from '../../common/application/global-database-context.js';
import { BaseType } from '../../common/data-injection.tokens.js';
import { LogOutEntity } from '../log-out/log-out.entity.js';
import { UserEntity } from '../user/user.entity.js';
import { CedarAuthorizationController } from './cedar-authorization.controller.js';
import { CedarAuthorizationService } from './cedar-authorization.service.js';
import { CedarPermissionsService } from './cedar-permissions.service.js';

@Global()
@Module({
	imports: [TypeOrmModule.forFeature([UserEntity, LogOutEntity])],
	providers: [
		{
			provide: BaseType.GLOBAL_DB_CONTEXT,
			useClass: GlobalDatabaseContext,
		},
		CedarAuthorizationService,
		CedarPermissionsService,
	],
	controllers: [CedarAuthorizationController],
	exports: [CedarAuthorizationService, CedarPermissionsService],
})
export class CedarAuthorizationModule implements NestModule {
	public configure(consumer: MiddlewareConsumer): void {
		consumer
			.apply(AuthMiddleware)
			.forRoutes(
				{ path: '/connection/cedar-schema/:connectionId', method: RequestMethod.GET },
				{ path: '/connection/cedar-schema/validate/:connectionId', method: RequestMethod.POST },
				{ path: '/connection/cedar-policy/:connectionId', method: RequestMethod.POST },
			);
	}
}
