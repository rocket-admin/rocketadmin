import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Injectable,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UserId } from '../../decorators/user-id.decorator.js';
import { MasterPassword } from '../../decorators/master-password.decorator.js';
import { SentryInterceptor } from '../../interceptors/sentry.interceptor.js';
import { CompanyUserGuard } from '../../guards/company-user.guard.js';
import { UseCaseType } from '../../common/data-injection.tokens.js';
import { InTransactionEnum } from '../../enums/in-transaction.enum.js';
import { CreateSecretDto } from './application/dto/create-secret.dto.js';
import { UpdateSecretDto } from './application/dto/update-secret.dto.js';
import { FoundSecretDto } from './application/dto/found-secret.dto.js';
import { SecretListResponseDto } from './application/dto/secret-list.dto.js';
import { AuditLogResponseDto } from './application/dto/audit-log.dto.js';
import { DeleteSecretResponseDto } from './application/dto/delete-secret.dto.js';
import {
  ICreateSecret,
  IDeleteSecret,
  IGetSecretAuditLog,
  IGetSecretBySlug,
  IGetSecrets,
  IUpdateSecret,
} from './use-cases/user-secret-use-cases.interface.js';
import { buildCreatedSecretDto } from './utils/build-created-secret.dto.js';
import { buildFoundSecretDto } from './utils/build-found-secret.dto.js';
import { buildUpdatedSecretDto } from './utils/build-updated-secret.dto.js';
import { buildSecretListResponseDto } from './utils/build-secret-list.dto.js';
import { buildAuditLogResponseDto } from './utils/build-audit-log.dto.js';

@UseInterceptors(SentryInterceptor)
@Controller()
@ApiBearerAuth()
@ApiTags('Secrets')
@Injectable()
export class UserSecretController {
  constructor(
    @Inject(UseCaseType.CREATE_SECRET)
    private readonly createSecretUseCase: ICreateSecret,
    @Inject(UseCaseType.GET_SECRETS)
    private readonly getSecretsUseCase: IGetSecrets,
    @Inject(UseCaseType.GET_SECRET_BY_SLUG)
    private readonly getSecretBySlugUseCase: IGetSecretBySlug,
    @Inject(UseCaseType.UPDATE_SECRET)
    private readonly updateSecretUseCase: IUpdateSecret,
    @Inject(UseCaseType.DELETE_SECRET)
    private readonly deleteSecretUseCase: IDeleteSecret,
    @Inject(UseCaseType.GET_SECRET_AUDIT_LOG)
    private readonly getSecretAuditLogUseCase: IGetSecretAuditLog,
  ) {}

  @ApiOperation({ summary: 'Create new secret' })
  @ApiBody({ type: CreateSecretDto })
  @ApiResponse({
    status: 201,
    description: 'Secret created successfully.',
    type: FoundSecretDto,
  })
  @ApiResponse({
    status: 404,
    description: 'User not found or not in a company.',
  })
  @ApiResponse({
    status: 409,
    description: 'Secret with this slug already exists in your company.',
  })
  @UseGuards(CompanyUserGuard)
  @Post('/secrets')
  @HttpCode(HttpStatus.CREATED)
  async createSecret(@UserId() userId: string, @Body() createDto: CreateSecretDto): Promise<FoundSecretDto> {
    const createdSecret = await this.createSecretUseCase.execute(
      {
        userId,
        slug: createDto.slug,
        value: createDto.value,
        expiresAt: createDto.expiresAt,
        masterEncryption: createDto.masterEncryption,
        masterPassword: createDto.masterPassword,
      },
      InTransactionEnum.ON,
    );
    return buildCreatedSecretDto(createdSecret);
  }

  @ApiOperation({ summary: 'Get all company secrets' })
  @ApiResponse({
    status: 200,
    description: 'Returns list of company secrets.',
    type: SecretListResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'User not found or not in a company.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 20)' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search term to filter secrets by slug' })
  @UseGuards(CompanyUserGuard)
  @Get('/secrets')
  async getSecrets(
    @UserId() userId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
  ): Promise<SecretListResponseDto> {
    const secretsList = await this.getSecretsUseCase.execute({
      userId,
      page: page || 1,
      limit: limit || 20,
      search,
    });
    return buildSecretListResponseDto(secretsList);
  }

  @ApiOperation({ summary: 'Get secret by slug' })
  @ApiResponse({
    status: 200,
    description: 'Returns secret details with decrypted value.',
    type: FoundSecretDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Master password required or incorrect.',
  })
  @ApiResponse({
    status: 404,
    description: 'Secret or user not found.',
  })
  @ApiResponse({
    status: 410,
    description: 'Secret has expired.',
  })
  @ApiParam({ name: 'slug', type: String, description: 'Unique secret identifier', example: 'database-password' })
  @UseGuards(CompanyUserGuard)
  @Get('/secrets/:slug')
  async getSecretBySlug(
    @UserId() userId: string,
    @Param('slug') slug: string,
    @MasterPassword() masterPassword?: string,
  ): Promise<FoundSecretDto> {
    const foundSecret = await this.getSecretBySlugUseCase.execute({
      userId,
      slug,
      masterPassword,
    });
    return buildFoundSecretDto(foundSecret);
  }

  @ApiOperation({ summary: 'Update secret' })
  @ApiBody({ type: UpdateSecretDto })
  @ApiResponse({
    status: 200,
    description: 'Secret updated successfully.',
    type: FoundSecretDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Master password required or incorrect.',
  })
  @ApiResponse({
    status: 404,
    description: 'Secret or user not found.',
  })
  @ApiResponse({
    status: 410,
    description: 'Secret has expired.',
  })
  @ApiParam({ name: 'slug', type: String, description: 'Unique secret identifier', example: 'database-password' })
  @UseGuards(CompanyUserGuard)
  @Put('/secrets/:slug')
  async updateSecret(
    @UserId() userId: string,
    @Param('slug') slug: string,
    @Body() updateDto: UpdateSecretDto,
    @MasterPassword() masterPassword?: string,
  ): Promise<FoundSecretDto> {
    const updatedSecret = await this.updateSecretUseCase.execute(
      {
        userId,
        slug,
        value: updateDto.value,
        expiresAt: updateDto.expiresAt,
        masterPassword,
      },
      InTransactionEnum.ON,
    );
    return buildUpdatedSecretDto(updatedSecret);
  }

  @ApiOperation({ summary: 'Delete secret' })
  @ApiResponse({
    status: 200,
    description: 'Secret deleted successfully.',
    type: DeleteSecretResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Secret or user not found.',
  })
  @ApiParam({ name: 'slug', type: String, description: 'Unique secret identifier', example: 'database-password' })
  @UseGuards(CompanyUserGuard)
  @Delete('/secrets/:slug')
  async deleteSecret(@UserId() userId: string, @Param('slug') slug: string): Promise<DeleteSecretResponseDto> {
    return await this.deleteSecretUseCase.execute({ userId, slug }, InTransactionEnum.ON);
  }

  @ApiOperation({ summary: 'Get secret audit log' })
  @ApiResponse({
    status: 200,
    description: 'Returns audit log for the secret.',
    type: AuditLogResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Secret or user not found.',
  })
  @ApiParam({ name: 'slug', type: String, description: 'Unique secret identifier', example: 'database-password' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 50)' })
  @UseGuards(CompanyUserGuard)
  @Get('/secrets/:slug/audit-log')
  async getAuditLog(
    @UserId() userId: string,
    @Param('slug') slug: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ): Promise<AuditLogResponseDto> {
    const auditLog = await this.getSecretAuditLogUseCase.execute({
      userId,
      slug,
      page: page || 1,
      limit: limit || 50,
    });
    return buildAuditLogResponseDto(auditLog);
  }
}
