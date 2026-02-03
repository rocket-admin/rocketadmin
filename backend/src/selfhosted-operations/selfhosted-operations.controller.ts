import { Body, Controller, Get, HttpStatus, Inject, Post, UseInterceptors } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SentryInterceptor } from '../interceptors/index.js';
import { IsConfiguredRo } from './application/responce-objects/is-configured.ro.js';
import { CreateInitialUserDto } from './application/dto/create-initial-admin-user.dto.js';
import { SimpleFoundUserInfoDs } from '../entities/user/dto/found-user.dto.js';
import { UseCaseType } from '../common/data-injection.tokens.js';
import {
	IIsConfiguredUseCase,
	ICreateInitialUserUseCase,
} from './application/use-cases/selfhosted-use-cases.interfaces.js';
import { InTransactionEnum } from '../enums/index.js';

@UseInterceptors(SentryInterceptor)
@Controller('selfhosted')
@ApiTags('Selfhosted Operations')
export class SelfHostedOperationsController {
	constructor(
		@Inject(UseCaseType.IS_CONFIGURED)
		private readonly isConfiguredUseCase: IIsConfiguredUseCase,
		@Inject(UseCaseType.CREATE_INITIAL_USER)
		private readonly createInitialUserUseCase: ICreateInitialUserUseCase,
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
}
