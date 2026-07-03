import { Body, Controller, Inject, Injectable, Post, Res, UseInterceptors } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { Response } from 'express';
import { UseCaseType } from '../../common/data-injection.tokens.js';
import { SlugUuid } from '../../decorators/slug-uuid.decorator.js';
import { Timeout, TimeoutDefaults } from '../../decorators/timeout.decorator.js';
import { InTransactionEnum } from '../../enums/in-transaction.enum.js';
import { isTest } from '../../helpers/app/is-test.js';
import { SentryInterceptor } from '../../interceptors/sentry.interceptor.js';
import {
	AiConnectionContextRO,
	AiConnectionTablesRO,
	AiQueryResultRO,
	AiSampleRowsRO,
	CompanySubscriptionInfoRO,
	PermissionAllowedRO,
	ValidatedUserTokenRO,
} from './data-structures/agents-responses.ds.js';
import {
	AiDataRequestBaseDto,
	ExecuteAiAggregationPipelineDto,
	ExecuteAiRawQueryDto,
	GetAiSampleRowsDto,
	GetAiTableStructureDto,
} from './dto/agents-ai-data.dtos.js';
import { ValidateConnectionEditDto, ValidateTableAiRequestDto, ValidateUserTokenDto } from './dto/agents-auth.dtos.js';
import { GetCompanySubscriptionInfoDto } from './dto/agents-company.dtos.js';
import {
	IExecuteAiAggregationPipeline,
	IExecuteAiRawQuery,
	IGetAiConnectionContext,
	IGetAiConnectionTables,
	IGetAiSampleRows,
	IGetAiTableStructure,
	IGetCompanySubscriptionInfo,
	IScanAndCreateSettings,
	IValidateConnectionEdit,
	IValidateTableAiRequest,
	IValidateUserToken,
} from './use-cases/agents-use-cases.interface.js';

@UseInterceptors(SentryInterceptor)
@SkipThrottle()
@Timeout()
@ApiTags('agents microservice')
@Controller('internal/agents')
@Injectable()
export class AgentsController {
	constructor(
		@Inject(UseCaseType.AGENTS_VALIDATE_USER_TOKEN)
		private readonly validateUserTokenUseCase: IValidateUserToken,
		@Inject(UseCaseType.AGENTS_VALIDATE_TABLE_AI_REQUEST)
		private readonly validateTableAiRequestUseCase: IValidateTableAiRequest,
		@Inject(UseCaseType.AGENTS_VALIDATE_CONNECTION_EDIT)
		private readonly validateConnectionEditUseCase: IValidateConnectionEdit,
		@Inject(UseCaseType.AGENTS_GET_AI_CONNECTION_CONTEXT)
		private readonly getAiConnectionContextUseCase: IGetAiConnectionContext,
		@Inject(UseCaseType.AGENTS_GET_AI_CONNECTION_TABLES)
		private readonly getAiConnectionTablesUseCase: IGetAiConnectionTables,
		@Inject(UseCaseType.AGENTS_GET_AI_TABLE_STRUCTURE)
		private readonly getAiTableStructureUseCase: IGetAiTableStructure,
		@Inject(UseCaseType.AGENTS_EXECUTE_AI_RAW_QUERY)
		private readonly executeAiRawQueryUseCase: IExecuteAiRawQuery,
		@Inject(UseCaseType.AGENTS_EXECUTE_AI_AGGREGATION_PIPELINE)
		private readonly executeAiAggregationPipelineUseCase: IExecuteAiAggregationPipeline,
		@Inject(UseCaseType.AGENTS_GET_AI_SAMPLE_ROWS)
		private readonly getAiSampleRowsUseCase: IGetAiSampleRows,
		@Inject(UseCaseType.AGENTS_SCAN_AND_CREATE_SETTINGS)
		private readonly scanAndCreateSettingsUseCase: IScanAndCreateSettings,
		@Inject(UseCaseType.AGENTS_GET_COMPANY_SUBSCRIPTION_INFO)
		private readonly getCompanySubscriptionInfoUseCase: IGetCompanySubscriptionInfo,
	) {}

	@ApiOperation({ summary: 'Validate an end-user JWT on behalf of the agents microservice' })
	@ApiResponse({ status: 201, type: ValidatedUserTokenRO })
	@ApiBody({ type: ValidateUserTokenDto })
	@Post('/auth/validate-user-token')
	public async validateUserToken(@Body() body: ValidateUserTokenDto): Promise<ValidatedUserTokenRO> {
		return await this.validateUserTokenUseCase.execute(body.token, InTransactionEnum.OFF);
	}

	@ApiOperation({ summary: 'Check Cedar permission for an AI request on a table' })
	@ApiResponse({ status: 201, type: PermissionAllowedRO })
	@ApiBody({ type: ValidateTableAiRequestDto })
	@Post('/auth/validate-table-ai-request')
	public async validateTableAiRequest(@Body() body: ValidateTableAiRequestDto): Promise<PermissionAllowedRO> {
		return await this.validateTableAiRequestUseCase.execute(
			{ userId: body.userId, connectionId: body.connectionId, tableName: body.tableName },
			InTransactionEnum.OFF,
		);
	}

	@ApiOperation({ summary: 'Check Cedar permission for editing a connection' })
	@ApiResponse({ status: 201, type: PermissionAllowedRO })
	@ApiBody({ type: ValidateConnectionEditDto })
	@Post('/auth/validate-connection-edit')
	public async validateConnectionEdit(@Body() body: ValidateConnectionEditDto): Promise<PermissionAllowedRO> {
		return await this.validateConnectionEditUseCase.execute(
			{ userId: body.userId, connectionId: body.connectionId },
			InTransactionEnum.OFF,
		);
	}

	@ApiOperation({ summary: 'Get AI-relevant connection context (type, schema, MongoDB flag)' })
	@ApiResponse({ status: 201, type: AiConnectionContextRO })
	@ApiBody({ type: AiDataRequestBaseDto })
	@Post('/ai/data/:connectionId/context')
	public async getAiConnectionContext(
		@SlugUuid('connectionId') connectionId: string,
		@Body() body: AiDataRequestBaseDto,
	): Promise<AiConnectionContextRO> {
		return await this.getAiConnectionContextUseCase.execute(
			{ connectionId, userId: body.userId, masterPassword: body.masterPassword ?? null },
			InTransactionEnum.OFF,
		);
	}

	@ApiOperation({ summary: 'List connection tables the user may read (grounds website feasibility)' })
	@ApiResponse({ status: 201, type: AiConnectionTablesRO })
	@ApiBody({ type: AiDataRequestBaseDto })
	@Timeout(!isTest() ? TimeoutDefaults.EXTENDED : TimeoutDefaults.EXTENDED_TEST)
	@Post('/ai/data/:connectionId/tables')
	public async getAiConnectionTables(
		@SlugUuid('connectionId') connectionId: string,
		@Body() body: AiDataRequestBaseDto,
	): Promise<AiConnectionTablesRO> {
		return await this.getAiConnectionTablesUseCase.execute(
			{ connectionId, userId: body.userId, masterPassword: body.masterPassword ?? null },
			InTransactionEnum.OFF,
		);
	}

	@ApiOperation({ summary: 'Get permission-aware table structure for the AI tool loop' })
	@ApiResponse({ status: 201, description: 'Table structure with related tables.' })
	@ApiBody({ type: GetAiTableStructureDto })
	@Timeout(!isTest() ? TimeoutDefaults.EXTENDED : TimeoutDefaults.EXTENDED_TEST)
	@Post('/ai/data/:connectionId/table-structure')
	public async getAiTableStructure(
		@SlugUuid('connectionId') connectionId: string,
		@Body() body: GetAiTableStructureDto,
	): Promise<Record<string, unknown>> {
		return await this.getAiTableStructureUseCase.execute(
			{
				connectionId,
				userId: body.userId,
				masterPassword: body.masterPassword ?? null,
				tableName: body.tableName,
			},
			InTransactionEnum.OFF,
		);
	}

	@ApiOperation({ summary: 'Validate and execute a read-only SQL query for the AI tool loop' })
	@ApiResponse({ status: 201, type: AiQueryResultRO })
	@ApiBody({ type: ExecuteAiRawQueryDto })
	@Timeout(!isTest() ? TimeoutDefaults.EXTENDED : TimeoutDefaults.EXTENDED_TEST)
	@Post('/ai/data/:connectionId/raw-query')
	public async executeAiRawQuery(
		@SlugUuid('connectionId') connectionId: string,
		@Body() body: ExecuteAiRawQueryDto,
	): Promise<AiQueryResultRO> {
		return await this.executeAiRawQueryUseCase.execute(
			{
				connectionId,
				userId: body.userId,
				masterPassword: body.masterPassword ?? null,
				tableName: body.tableName,
				query: body.query,
			},
			InTransactionEnum.OFF,
		);
	}

	@ApiOperation({ summary: 'Fetch permission-filtered sample rows and a row count (grounds website generation)' })
	@ApiResponse({ status: 201, type: AiSampleRowsRO })
	@ApiBody({ type: GetAiSampleRowsDto })
	@Timeout(!isTest() ? TimeoutDefaults.EXTENDED : TimeoutDefaults.EXTENDED_TEST)
	@Post('/ai/data/:connectionId/sample-rows')
	public async getAiSampleRows(
		@SlugUuid('connectionId') connectionId: string,
		@Body() body: GetAiSampleRowsDto,
	): Promise<AiSampleRowsRO> {
		return await this.getAiSampleRowsUseCase.execute(
			{
				connectionId,
				userId: body.userId,
				masterPassword: body.masterPassword ?? null,
				tableName: body.tableName,
				limit: body.limit ?? null,
			},
			InTransactionEnum.OFF,
		);
	}

	@ApiOperation({ summary: 'Validate and execute a read-only MongoDB aggregation pipeline for the AI tool loop' })
	@ApiResponse({ status: 201, type: AiQueryResultRO })
	@ApiBody({ type: ExecuteAiAggregationPipelineDto })
	@Timeout(!isTest() ? TimeoutDefaults.EXTENDED : TimeoutDefaults.EXTENDED_TEST)
	@Post('/ai/data/:connectionId/aggregation-pipeline')
	public async executeAiAggregationPipeline(
		@SlugUuid('connectionId') connectionId: string,
		@Body() body: ExecuteAiAggregationPipelineDto,
	): Promise<AiQueryResultRO> {
		return await this.executeAiAggregationPipelineUseCase.execute(
			{
				connectionId,
				userId: body.userId,
				masterPassword: body.masterPassword ?? null,
				tableName: body.tableName,
				pipeline: body.pipeline,
			},
			InTransactionEnum.OFF,
		);
	}

	@ApiOperation({ summary: 'Run the AI settings/widgets scan, streaming progress chunks' })
	@ApiResponse({ status: 201, description: 'Streams progress as newline-delimited JSON chunks.' })
	@ApiBody({ type: AiDataRequestBaseDto })
	@Timeout(!isTest() ? TimeoutDefaults.AI : TimeoutDefaults.AI_TEST)
	@Post('/ai/data/:connectionId/settings-scan')
	public async scanAndCreateSettings(
		@SlugUuid('connectionId') connectionId: string,
		@Body() body: AiDataRequestBaseDto,
		@Res({ passthrough: true }) response: Response,
	): Promise<void> {
		return await this.scanAndCreateSettingsUseCase.execute(
			{
				connectionId,
				userId: body.userId,
				masterPassword: body.masterPassword ?? null,
				response,
			},
			InTransactionEnum.OFF,
		);
	}

	@ApiOperation({ summary: "Read a user's company subscription metadata (agents-core owns all feature policy)" })
	@ApiResponse({ status: 201, type: CompanySubscriptionInfoRO })
	@ApiBody({ type: GetCompanySubscriptionInfoDto })
	@Post('/company/subscription-info')
	public async getCompanySubscriptionInfo(
		@Body() body: GetCompanySubscriptionInfoDto,
	): Promise<CompanySubscriptionInfoRO> {
		return await this.getCompanySubscriptionInfoUseCase.execute({ userId: body.userId }, InTransactionEnum.OFF);
	}
}
