import {
	Body,
	Controller,
	Get,
	HttpCode,
	HttpStatus,
	Inject,
	Injectable,
	Post,
	Query,
	UseGuards,
	UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UseCaseType } from '../../common/data-injection.tokens.js';
import { MasterPassword } from '../../decorators/master-password.decorator.js';
import { SlugUuid } from '../../decorators/slug-uuid.decorator.js';
import { Timeout, TimeoutDefaults } from '../../decorators/timeout.decorator.js';
import { UserId } from '../../decorators/user-id.decorator.js';
import { ConnectionEditGuard } from '../../guards/connection-edit.guard.js';
import { SchemaChangeBatchOwnershipGuard } from '../../guards/schema-change-batch-ownership.guard.js';
import { SchemaChangeOwnershipGuard } from '../../guards/schema-change-ownership.guard.js';
import { SentryInterceptor } from '../../interceptors/sentry.interceptor.js';
import { ApproveBatchSchemaChangeDto } from './application/data-transfer-objects/approve-batch-schema-change.dto.js';
import { ApproveSchemaChangeDto } from './application/data-transfer-objects/approve-schema-change.dto.js';
import { GenerateSchemaChangeDto } from './application/data-transfer-objects/generate-schema-change.dto.js';
import { SchemaChangeBatchResponseDto } from './application/data-transfer-objects/schema-change-batch-response.dto.js';
import { SchemaChangeListResponseDto } from './application/data-transfer-objects/schema-change-list-response.dto.js';
import { SchemaChangeResponseDto } from './application/data-transfer-objects/schema-change-response.dto.js';
import {
	IApproveBatchSchemaChange,
	IApproveSchemaChange,
	IGenerateSchemaChange,
	IGetBatchSchemaChange,
	IGetSchemaChange,
	IListSchemaChanges,
	IRejectBatchSchemaChange,
	IRejectSchemaChange,
	IRollbackBatchSchemaChange,
	IRollbackSchemaChange,
} from './use-cases/table-schema-use-cases.interface.js';

@UseInterceptors(SentryInterceptor)
@Controller()
@ApiBearerAuth()
@ApiTags('Table Schema Changes')
@Injectable()
export class TableSchemaController {
	constructor(
		@Inject(UseCaseType.GENERATE_SCHEMA_CHANGE)
		private readonly generateSchemaChangeUseCase: IGenerateSchemaChange,
		@Inject(UseCaseType.APPROVE_SCHEMA_CHANGE)
		private readonly approveSchemaChangeUseCase: IApproveSchemaChange,
		@Inject(UseCaseType.REJECT_SCHEMA_CHANGE)
		private readonly rejectSchemaChangeUseCase: IRejectSchemaChange,
		@Inject(UseCaseType.ROLLBACK_SCHEMA_CHANGE)
		private readonly rollbackSchemaChangeUseCase: IRollbackSchemaChange,
		@Inject(UseCaseType.LIST_SCHEMA_CHANGES)
		private readonly listSchemaChangesUseCase: IListSchemaChanges,
		@Inject(UseCaseType.GET_SCHEMA_CHANGE)
		private readonly getSchemaChangeUseCase: IGetSchemaChange,
		@Inject(UseCaseType.APPROVE_BATCH_SCHEMA_CHANGE)
		private readonly approveBatchSchemaChangeUseCase: IApproveBatchSchemaChange,
		@Inject(UseCaseType.REJECT_BATCH_SCHEMA_CHANGE)
		private readonly rejectBatchSchemaChangeUseCase: IRejectBatchSchemaChange,
		@Inject(UseCaseType.ROLLBACK_BATCH_SCHEMA_CHANGE)
		private readonly rollbackBatchSchemaChangeUseCase: IRollbackBatchSchemaChange,
		@Inject(UseCaseType.GET_BATCH_SCHEMA_CHANGE)
		private readonly getBatchSchemaChangeUseCase: IGetBatchSchemaChange,
	) {}

	@ApiOperation({
		summary:
			'Generate one or more schema changes from a natural-language prompt. The response is always a batch envelope; single-change prompts return a length-1 array. Pass an optional threadId in the body to continue an existing conversation; the response returns the threadId to use for follow-up turns.',
	})
	@ApiParam({ name: 'connectionId', type: String })
	@ApiBody({ type: GenerateSchemaChangeDto })
	@ApiResponse({ status: 201, type: SchemaChangeBatchResponseDto })
	@UseGuards(ConnectionEditGuard)
	@Timeout(TimeoutDefaults.AI)
	@Post('/table-schema/:connectionId/generate')
	@HttpCode(HttpStatus.CREATED)
	async generate(
		@SlugUuid('connectionId') connectionId: string,
		@UserId() userId: string,
		@MasterPassword() masterPassword: string,
		@Body() body: GenerateSchemaChangeDto,
	): Promise<SchemaChangeBatchResponseDto> {
		return await this.generateSchemaChangeUseCase.execute({
			connectionId,
			userPrompt: body.userPrompt,
			userId,
			masterPassword,
			threadId: body.threadId ?? null,
		});
	}

	@ApiOperation({ summary: 'Approve and apply a pending schema change.' })
	@ApiParam({ name: 'changeId', type: String })
	@ApiBody({ type: ApproveSchemaChangeDto, required: false })
	@ApiResponse({ status: 200, type: SchemaChangeResponseDto })
	@UseGuards(SchemaChangeOwnershipGuard)
	@Post('/table-schema/change/:changeId/approve')
	@HttpCode(HttpStatus.OK)
	async approve(
		@SlugUuid('changeId') changeId: string,
		@UserId() userId: string,
		@MasterPassword() masterPassword: string,
		@Body() body: ApproveSchemaChangeDto,
	): Promise<SchemaChangeResponseDto> {
		return await this.approveSchemaChangeUseCase.execute({
			changeId,
			userId,
			masterPassword,
			userModifiedSql: body?.userModifiedSql,
			confirmedDestructive: body?.confirmedDestructive,
		});
	}

	@ApiOperation({ summary: 'Reject a pending schema change.' })
	@ApiParam({ name: 'changeId', type: String })
	@ApiResponse({ status: 200, type: SchemaChangeResponseDto })
	@UseGuards(SchemaChangeOwnershipGuard)
	@Post('/table-schema/change/:changeId/reject')
	@HttpCode(HttpStatus.OK)
	async reject(@SlugUuid('changeId') changeId: string, @UserId() userId: string): Promise<SchemaChangeResponseDto> {
		return await this.rejectSchemaChangeUseCase.execute({ changeId, userId });
	}

	@ApiOperation({ summary: 'Roll back a previously applied schema change.' })
	@ApiParam({ name: 'changeId', type: String })
	@ApiResponse({ status: 200, type: SchemaChangeResponseDto })
	@UseGuards(SchemaChangeOwnershipGuard)
	@Post('/table-schema/change/:changeId/rollback')
	@HttpCode(HttpStatus.OK)
	async rollback(
		@SlugUuid('changeId') changeId: string,
		@UserId() userId: string,
		@MasterPassword() masterPassword: string,
	): Promise<SchemaChangeResponseDto> {
		return await this.rollbackSchemaChangeUseCase.execute({ changeId, userId, masterPassword });
	}

	@ApiOperation({ summary: 'List schema-change history for a connection (newest first).' })
	@ApiParam({ name: 'connectionId', type: String })
	@ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 20, max: 100).' })
	@ApiQuery({ name: 'offset', required: false, type: Number, description: 'Rows to skip (default: 0).' })
	@ApiResponse({ status: 200, type: SchemaChangeListResponseDto })
	@UseGuards(ConnectionEditGuard)
	@Get('/table-schema/:connectionId/changes')
	async list(
		@SlugUuid('connectionId') connectionId: string,
		@UserId() userId: string,
		@Query('limit') rawLimit?: string,
		@Query('offset') rawOffset?: string,
	): Promise<SchemaChangeListResponseDto> {
		const limit = Math.min(Math.max(Number.parseInt(rawLimit ?? '20', 10) || 20, 1), 100);
		const offset = Math.max(Number.parseInt(rawOffset ?? '0', 10) || 0, 0);
		return await this.listSchemaChangesUseCase.execute({ connectionId, userId, limit, offset });
	}

	@ApiOperation({ summary: 'Get a single schema change.' })
	@ApiParam({ name: 'changeId', type: String })
	@ApiResponse({ status: 200, type: SchemaChangeResponseDto })
	@UseGuards(SchemaChangeOwnershipGuard)
	@Get('/table-schema/change/:changeId')
	async get(@SlugUuid('changeId') changeId: string, @UserId() userId: string): Promise<SchemaChangeResponseDto> {
		return await this.getSchemaChangeUseCase.execute({ changeId, userId });
	}

	@ApiOperation({
		summary:
			'Approve and apply every pending change in a batch in dependency order. Halts on first failure and rolls back already-applied items in reverse.',
	})
	@ApiParam({ name: 'batchId', type: String })
	@ApiBody({ type: ApproveBatchSchemaChangeDto, required: false })
	@ApiResponse({ status: 200, type: SchemaChangeBatchResponseDto })
	@UseGuards(SchemaChangeBatchOwnershipGuard)
	@Post('/table-schema/batch/:batchId/approve')
	@HttpCode(HttpStatus.OK)
	async approveBatch(
		@SlugUuid('batchId') batchId: string,
		@UserId() userId: string,
		@MasterPassword() masterPassword: string,
		@Body() body: ApproveBatchSchemaChangeDto,
	): Promise<SchemaChangeBatchResponseDto> {
		return await this.approveBatchSchemaChangeUseCase.execute({
			batchId,
			userId,
			masterPassword,
			confirmedDestructive: body?.confirmedDestructive,
		});
	}

	@ApiOperation({ summary: 'Reject every pending change in a batch.' })
	@ApiParam({ name: 'batchId', type: String })
	@ApiResponse({ status: 200, type: SchemaChangeBatchResponseDto })
	@UseGuards(SchemaChangeBatchOwnershipGuard)
	@Post('/table-schema/batch/:batchId/reject')
	@HttpCode(HttpStatus.OK)
	async rejectBatch(
		@SlugUuid('batchId') batchId: string,
		@UserId() userId: string,
	): Promise<SchemaChangeBatchResponseDto> {
		return await this.rejectBatchSchemaChangeUseCase.execute({ batchId, userId });
	}

	@ApiOperation({ summary: 'Roll back every applied change in a batch in reverse order.' })
	@ApiParam({ name: 'batchId', type: String })
	@ApiResponse({ status: 200, type: SchemaChangeBatchResponseDto })
	@UseGuards(SchemaChangeBatchOwnershipGuard)
	@Post('/table-schema/batch/:batchId/rollback')
	@HttpCode(HttpStatus.OK)
	async rollbackBatch(
		@SlugUuid('batchId') batchId: string,
		@UserId() userId: string,
		@MasterPassword() masterPassword: string,
	): Promise<SchemaChangeBatchResponseDto> {
		return await this.rollbackBatchSchemaChangeUseCase.execute({ batchId, userId, masterPassword });
	}

	@ApiOperation({ summary: 'Get every change in a batch (ordered by orderInBatch).' })
	@ApiParam({ name: 'batchId', type: String })
	@ApiResponse({ status: 200, type: SchemaChangeBatchResponseDto })
	@UseGuards(SchemaChangeBatchOwnershipGuard)
	@Get('/table-schema/batch/:batchId')
	async getBatch(
		@SlugUuid('batchId') batchId: string,
		@UserId() userId: string,
	): Promise<SchemaChangeBatchResponseDto> {
		return await this.getBatchSchemaChangeUseCase.execute({ batchId, userId });
	}
}
