import {
	Body,
	Controller,
	Get,
	HttpCode,
	HttpStatus,
	Inject,
	Injectable,
	Param,
	Post,
	Query,
	UseGuards,
	UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UseCaseType } from '../../common/data-injection.tokens.js';
import { MasterPassword } from '../../decorators/master-password.decorator.js';
import { SlugUuid } from '../../decorators/slug-uuid.decorator.js';
import { UserId } from '../../decorators/user-id.decorator.js';
import { ConnectionEditGuard } from '../../guards/index.js';
import { SentryInterceptor } from '../../interceptors/sentry.interceptor.js';
import { ApproveSchemaChangeDto } from './application/data-transfer-objects/approve-schema-change.dto.js';
import { GenerateSchemaChangeDto } from './application/data-transfer-objects/generate-schema-change.dto.js';
import { SchemaChangeListResponseDto } from './application/data-transfer-objects/schema-change-list-response.dto.js';
import { SchemaChangeResponseDto } from './application/data-transfer-objects/schema-change-response.dto.js';
import {
	IApproveSchemaChange,
	IGenerateSchemaChange,
	IGetSchemaChange,
	IListSchemaChanges,
	IRejectSchemaChange,
	IRollbackSchemaChange,
} from './use-cases/table-schema-use-cases.interface.js';
import { SchemaChangeOwnershipGuard } from './utils/schema-change-ownership.guard.js';

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
	) {}

	@ApiOperation({ summary: 'Generate a schema change from a natural-language prompt.' })
	@ApiParam({ name: 'connectionId', type: String })
	@ApiBody({ type: GenerateSchemaChangeDto })
	@ApiResponse({ status: 201, type: SchemaChangeResponseDto })
	@UseGuards(ConnectionEditGuard)
	@Post('/table-schema/:connectionId/generate')
	@HttpCode(HttpStatus.CREATED)
	async generate(
		@SlugUuid('connectionId') connectionId: string,
		@UserId() userId: string,
		@MasterPassword() masterPassword: string,
		@Body() body: GenerateSchemaChangeDto,
	): Promise<SchemaChangeResponseDto> {
		return await this.generateSchemaChangeUseCase.execute({
			connectionId,
			userPrompt: body.userPrompt,
			userId,
			masterPassword,
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
		@Param('changeId') changeId: string,
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
	async reject(@Param('changeId') changeId: string, @UserId() userId: string): Promise<SchemaChangeResponseDto> {
		return await this.rejectSchemaChangeUseCase.execute({ changeId, userId });
	}

	@ApiOperation({ summary: 'Roll back a previously applied schema change.' })
	@ApiParam({ name: 'changeId', type: String })
	@ApiResponse({ status: 200, type: SchemaChangeResponseDto })
	@UseGuards(SchemaChangeOwnershipGuard)
	@Post('/table-schema/change/:changeId/rollback')
	@HttpCode(HttpStatus.OK)
	async rollback(
		@Param('changeId') changeId: string,
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
	async get(@Param('changeId') changeId: string, @UserId() userId: string): Promise<SchemaChangeResponseDto> {
		return await this.getSchemaChangeUseCase.execute({ changeId, userId });
	}
}
