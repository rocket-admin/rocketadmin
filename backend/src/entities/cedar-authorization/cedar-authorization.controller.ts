import {
	Body,
	Controller,
	Get,
	HttpException,
	HttpStatus,
	Injectable,
	Post,
	Put,
	UseGuards,
	UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SlugUuid } from '../../decorators/slug-uuid.decorator.js';
import { Timeout } from '../../decorators/timeout.decorator.js';
import { Messages } from '../../exceptions/text/messages.js';
import { ConnectionEditGuard } from '../../guards/connection-edit.guard.js';
import { ConnectionReadGuard } from '../../guards/connection-read.guard.js';
import { SentryInterceptor } from '../../interceptors/sentry.interceptor.js';
import { IComplexPermission } from '../permission/permission.interface.js';
import { CedarAuthorizationService } from './cedar-authorization.service.js';
import { PublicPermissionsResponseDto, SetPublicPermissionsDto } from './dto/public-permissions.dto.js';
import { SaveCedarPolicyDto } from './dto/save-cedar-policy.dto.js';
import { ValidateCedarSchemaDto } from './dto/validate-cedar-schema.dto.js';

@UseInterceptors(SentryInterceptor)
@Timeout()
@Controller()
@ApiBearerAuth()
@ApiTags('Cedar Authorization')
@Injectable()
export class CedarAuthorizationController {
	constructor(private readonly cedarAuthService: CedarAuthorizationService) {}

	@ApiOperation({ summary: 'Get the current cedar schema used for authorization' })
	@ApiResponse({
		status: 200,
		description: 'Cedar schema returned.',
	})
	@ApiParam({ name: 'connectionId', required: true })
	@UseGuards(ConnectionReadGuard)
	@Get('/connection/cedar-schema/:connectionId')
	async getCedarSchema(
		@SlugUuid('connectionId') connectionId: string,
	): Promise<{ cedarSchema: Record<string, unknown> }> {
		if (!connectionId) {
			throw new HttpException({ message: Messages.CONNECTION_ID_MISSING }, HttpStatus.BAD_REQUEST);
		}
		return { cedarSchema: this.cedarAuthService.getSchema() };
	}

	@ApiOperation({ summary: 'Validate a cedar schema against the Cedar engine' })
	@ApiResponse({
		status: 200,
		description: 'Cedar schema is valid.',
	})
	@ApiBody({ type: ValidateCedarSchemaDto })
	@ApiParam({ name: 'connectionId', required: true })
	@UseGuards(ConnectionReadGuard)
	@Post('/connection/cedar-schema/validate/:connectionId')
	async validateCedarSchema(
		@SlugUuid('connectionId') connectionId: string,
		@Body() dto: ValidateCedarSchemaDto,
	): Promise<{ valid: boolean }> {
		if (!connectionId) {
			throw new HttpException({ message: Messages.CONNECTION_ID_MISSING }, HttpStatus.BAD_REQUEST);
		}
		this.cedarAuthService.validateCedarSchema(dto.cedarSchema);
		return { valid: true };
	}

	@ApiOperation({
		summary: 'Save a cedar policy for a group, generating classical permissions for backward compatibility',
	})
	@ApiResponse({
		status: 200,
		description: 'Cedar policy saved and classical permissions generated.',
	})
	@ApiBody({ type: SaveCedarPolicyDto })
	@ApiParam({ name: 'connectionId', required: true })
	@UseGuards(ConnectionEditGuard)
	@Post('/connection/cedar-policy/:connectionId')
	async saveCedarPolicy(
		@SlugUuid('connectionId') connectionId: string,
		@Body() dto: SaveCedarPolicyDto,
	): Promise<{ cedarPolicy: string; classicalPermissions: IComplexPermission }> {
		if (!connectionId) {
			throw new HttpException({ message: Messages.CONNECTION_ID_MISSING }, HttpStatus.BAD_REQUEST);
		}
		return this.cedarAuthService.saveCedarPolicy(connectionId, dto.groupId, dto.cedarPolicy);
	}

	@ApiOperation({
		summary: 'Get the public (unauthenticated) read permissions configured for a connection',
	})
	@ApiResponse({ status: 200, description: 'Public permissions returned.', type: PublicPermissionsResponseDto })
	@ApiParam({ name: 'connectionId', required: true })
	@UseGuards(ConnectionEditGuard)
	@Get('/connection/public-permissions/:connectionId')
	async getPublicPermissions(@SlugUuid('connectionId') connectionId: string): Promise<PublicPermissionsResponseDto> {
		if (!connectionId) {
			throw new HttpException({ message: Messages.CONNECTION_ID_MISSING }, HttpStatus.BAD_REQUEST);
		}
		return this.cedarAuthService.getPublicPermissions(connectionId);
	}

	@ApiOperation({
		summary: 'Set the public (unauthenticated) read permissions for a connection',
		description:
			'Generates and stores a Cedar policy granting public users QueryTable + ColumnRead on the listed tables. ' +
			'Pass an empty "tables" array to disable public access.',
	})
	@ApiResponse({ status: 200, description: 'Public permissions saved.', type: PublicPermissionsResponseDto })
	@ApiBody({ type: SetPublicPermissionsDto })
	@ApiParam({ name: 'connectionId', required: true })
	@UseGuards(ConnectionEditGuard)
	@Put('/connection/public-permissions/:connectionId')
	async setPublicPermissions(
		@SlugUuid('connectionId') connectionId: string,
		@Body() dto: SetPublicPermissionsDto,
	): Promise<PublicPermissionsResponseDto> {
		if (!connectionId) {
			throw new HttpException({ message: Messages.CONNECTION_ID_MISSING }, HttpStatus.BAD_REQUEST);
		}
		const { enabled, tables } = await this.cedarAuthService.savePublicPermissions(connectionId, dto.tables ?? []);
		return { enabled, tables };
	}
}
