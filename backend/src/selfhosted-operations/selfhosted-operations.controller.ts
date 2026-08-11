import { Body, Controller, Get, HttpStatus, Inject, Post, Put, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UseCaseType } from '../common/data-injection.tokens.js';
import { SlugUuid } from '../decorators/slug-uuid.decorator.js';
import { UserId } from '../decorators/user-id.decorator.js';
import { SimpleFoundUserInfoDs } from '../entities/user/dto/found-user.dto.js';
import { InTransactionEnum } from '../enums/in-transaction.enum.js';
import { CompanyAdminGuard } from '../guards/company-admin.guard.js';
import { SentryInterceptor } from '../interceptors/sentry.interceptor.js';
import { SuccessResponse } from '../microservices/saas-microservice/data-structures/common-responce.ds.js';
import { CreateInitialUserDto } from './application/dto/create-initial-admin-user.dto.js';
import { UpdateUserEmailAsAdminDto } from './application/dto/update-user-email-as-admin.dto.js';
import { UpdateUserPasswordAsAdminDto } from './application/dto/update-user-password-as-admin.dto.js';
import { IsConfiguredRo } from './application/responce-objects/is-configured.ro.js';
import {
	ICreateInitialUserUseCase,
	IIsConfiguredUseCase,
	IUpdateUserEmailAsAdminUseCase,
	IUpdateUserPasswordAsAdminUseCase,
} from './application/use-cases/selfhosted-use-cases.interfaces.js';

@UseInterceptors(SentryInterceptor)
@Controller('selfhosted')
@ApiTags('Selfhosted Operations')
export class SelfHostedOperationsController {
	constructor(
		@Inject(UseCaseType.IS_CONFIGURED)
		private readonly isConfiguredUseCase: IIsConfiguredUseCase,
		@Inject(UseCaseType.CREATE_INITIAL_USER)
		private readonly createInitialUserUseCase: ICreateInitialUserUseCase,
		@Inject(UseCaseType.SELFHOSTED_UPDATE_USER_PASSWORD)
		private readonly updateUserPasswordAsAdminUseCase: IUpdateUserPasswordAsAdminUseCase,
		@Inject(UseCaseType.SELFHOSTED_UPDATE_USER_EMAIL)
		private readonly updateUserEmailAsAdminUseCase: IUpdateUserEmailAsAdminUseCase,
	) {}

	@Get('/is-configured')
	@ApiOperation({ summary: 'Check if self-hosted instance is configured' })
	@ApiResponse({
		status: HttpStatus.OK,
		description: 'Returns whether the instance is configured',
		type: IsConfiguredRo,
	})
	public async isConfigured(): Promise<IsConfiguredRo> {
		return await this.isConfiguredUseCase.execute(undefined, InTransactionEnum.OFF);
	}

	@Post('/initial-user')
	@ApiOperation({ summary: 'Create initial user for self-hosted instance' })
	@ApiBody({ type: CreateInitialUserDto })
	@ApiResponse({
		status: HttpStatus.CREATED,
		description: 'Initial user created successfully',
		type: SimpleFoundUserInfoDs,
	})
	@ApiResponse({
		status: HttpStatus.BAD_REQUEST,
		description: 'Instance already configured or endpoint not available in SaaS mode',
	})
	public async createInitialUser(@Body() createInitialUserDto: CreateInitialUserDto): Promise<SimpleFoundUserInfoDs> {
		return await this.createInitialUserUseCase.execute(createInitialUserDto, InTransactionEnum.OFF);
	}

	// Plan 15 Phase 6 (rev 5): admin-managed replacement for the email-based password
	// recovery flow, which does not exist self-hosted.
	@UseGuards(CompanyAdminGuard)
	@Put('/users/:userId/password')
	@ApiOperation({ summary: 'Set a new password for a user of the admin`s company (self-hosted only)' })
	@ApiBody({ type: UpdateUserPasswordAsAdminDto })
	@ApiResponse({
		status: HttpStatus.OK,
		description: 'Password updated successfully',
		type: SuccessResponse,
	})
	public async updateUserPassword(
		@UserId() callerUserId: string,
		@SlugUuid('userId') targetUserId: string,
		@Body() dto: UpdateUserPasswordAsAdminDto,
	): Promise<SuccessResponse> {
		return await this.updateUserPasswordAsAdminUseCase.execute(
			{ callerUserId, targetUserId, newPassword: dto.newPassword },
			InTransactionEnum.OFF,
		);
	}

	// Plan 15 Phase 6 (rev 5): admin-managed replacement for the email-change verification
	// flow, which does not exist self-hosted.
	@UseGuards(CompanyAdminGuard)
	@Put('/users/:userId/email')
	@ApiOperation({ summary: 'Set a new email for a user of the admin`s company (self-hosted only)' })
	@ApiBody({ type: UpdateUserEmailAsAdminDto })
	@ApiResponse({
		status: HttpStatus.OK,
		description: 'Email updated successfully',
		type: SuccessResponse,
	})
	public async updateUserEmail(
		@UserId() callerUserId: string,
		@SlugUuid('userId') targetUserId: string,
		@Body() dto: UpdateUserEmailAsAdminDto,
	): Promise<SuccessResponse> {
		return await this.updateUserEmailAsAdminUseCase.execute(
			{ callerUserId, targetUserId, newEmail: dto.newEmail },
			InTransactionEnum.OFF,
		);
	}
}
