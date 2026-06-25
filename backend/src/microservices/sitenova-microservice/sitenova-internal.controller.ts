import { Body, Controller, Inject, Injectable, Post, UseInterceptors } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { UseCaseType } from '../../common/data-injection.tokens.js';
import { SlugUuid } from '../../decorators/slug-uuid.decorator.js';
import { Timeout, TimeoutDefaults } from '../../decorators/timeout.decorator.js';
import { InTransactionEnum } from '../../enums/in-transaction.enum.js';
import { isTest } from '../../helpers/app/is-test.js';
import { SentryInterceptor } from '../../interceptors/sentry.interceptor.js';
import { SitenovaRawQueryResultRO } from './data-structures/sitenova-responses.ds.js';
import { SitenovaExecuteRawQueryDto } from './dto/sitenova.dtos.js';
import { ISitenovaExecuteRawQuery } from './use-cases/sitenova-use-cases.interface.js';

// Internal, microservice-authenticated controller (SaaSAuthMiddleware / microservice JWT), used by
// the SiteNova agents service only. The single endpoint runs write-capable raw SQL so the AI agent
// can provision schema (e.g. CREATE TABLE, including the users/auth table the generated site needs)
// in the user's connected database. Browser-facing CRUD + auth live in SitenovaSiteController.
@UseInterceptors(SentryInterceptor)
@SkipThrottle()
@Timeout()
@ApiTags('sitenova microservice')
@Controller('internal/sitenova')
@Injectable()
export class SitenovaInternalController {
	constructor(
		@Inject(UseCaseType.SITENOVA_EXECUTE_RAW_QUERY)
		private readonly executeRawQueryUseCase: ISitenovaExecuteRawQuery,
	) {}

	@ApiOperation({
		summary: 'Execute a raw, write-capable SQL statement against the connected database.',
		description:
			'Runs arbitrary SQL (DDL/DML) so the SiteNova agent can provision schema (e.g. CREATE TABLE) ' +
			'in the user connection. No read-only validation is applied; the connected DB user privileges ' +
			'are the only constraint.',
	})
	@ApiResponse({ status: 201, type: SitenovaRawQueryResultRO })
	@ApiBody({ type: SitenovaExecuteRawQueryDto })
	@Timeout(!isTest() ? TimeoutDefaults.EXTENDED : TimeoutDefaults.EXTENDED_TEST)
	@Post('/raw-query/:connectionId')
	public async executeRawQuery(
		@SlugUuid('connectionId') connectionId: string,
		@Body() body: SitenovaExecuteRawQueryDto,
	): Promise<SitenovaRawQueryResultRO> {
		return await this.executeRawQueryUseCase.execute(
			{
				connectionId,
				userId: body.userId,
				masterPassword: body.masterPassword ?? null,
				query: body.query,
				tableName: body.tableName ?? null,
			},
			InTransactionEnum.OFF,
		);
	}
}
