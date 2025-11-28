import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Injectable,
  Param,
  Post,
  Put,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UserId } from '../../decorators/user-id.decorator.js';
import { MasterPassword } from '../../decorators/master-password.decorator.js';
import { SentryInterceptor } from '../../interceptors/sentry.interceptor.js';
import { CreateSecretDto } from './application/dto/create-secret.dto.js';
import { UpdateSecretDto } from './application/dto/update-secret.dto.js';
import { FoundSecretDto } from './application/dto/found-secret.dto.js';
import { SecretListResponseDto } from './application/dto/secret-list.dto.js';
import { AuditLogResponseDto } from './application/dto/audit-log.dto.js';
import { UserSecretsService } from './user-secrets.service.js';

@UseInterceptors(SentryInterceptor)
@Controller()
@ApiBearerAuth()
@ApiTags('Secrets')
@Injectable()
export class UserSecretController {
  constructor(private readonly userSecretsService: UserSecretsService) {}

  @ApiOperation({ summary: 'Create new secret' })
  @ApiResponse({
    status: 201,
    description: 'Secret created successfully.',
    type: FoundSecretDto,
  })
  @ApiResponse({
    status: 409,
    description: 'Secret with this slug already exists in your company.',
  })
  @Post('/secrets')
  @HttpCode(HttpStatus.CREATED)
  async createSecret(@UserId() userId: string, @Body() createDto: CreateSecretDto): Promise<FoundSecretDto> {
    return await this.userSecretsService.createSecret(userId, createDto);
  }

  @ApiOperation({ summary: 'Get all company secrets' })
  @ApiResponse({
    status: 200,
    description: 'Returns list of company secrets.',
    type: SecretListResponseDto,
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @Get('/secrets')
  async getSecrets(
    @UserId() userId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
  ): Promise<SecretListResponseDto> {
    return await this.userSecretsService.getSecrets(userId, {
      page: page || 1,
      limit: limit || 20,
      search,
    });
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
    description: 'Secret not found.',
  })
  @ApiResponse({
    status: 410,
    description: 'Secret has expired.',
  })
  @Get('/secrets/:slug')
  async getSecretBySlug(
    @UserId() userId: string,
    @Param('slug') slug: string,
    @MasterPassword() masterPassword?: string,
  ): Promise<FoundSecretDto> {
    return await this.userSecretsService.getSecretBySlug(userId, slug, masterPassword);
  }

  @ApiOperation({ summary: 'Update secret' })
  @ApiResponse({
    status: 200,
    description: 'Secret updated successfully.',
    type: FoundSecretDto,
  })
  @ApiResponse({
    status: 403,
    description: 'You don\'t have permission to modify this secret.',
  })
  @ApiResponse({
    status: 404,
    description: 'Secret not found.',
  })
  @Put('/secrets/:slug')
  async updateSecret(
    @UserId() userId: string,
    @Param('slug') slug: string,
    @Body() updateDto: UpdateSecretDto,
    @MasterPassword() masterPassword?: string,
  ): Promise<FoundSecretDto> {
    return await this.userSecretsService.updateSecret(userId, slug, updateDto, masterPassword);
  }

  @ApiOperation({ summary: 'Delete secret' })
  @ApiResponse({
    status: 200,
    description: 'Secret deleted successfully.',
  })
  @ApiResponse({
    status: 403,
    description: 'You don\'t have permission to delete this secret.',
  })
  @ApiResponse({
    status: 404,
    description: 'Secret not found.',
  })
  @Delete('/secrets/:slug')
  async deleteSecret(@UserId() userId: string, @Param('slug') slug: string): Promise<{ message: string; deletedAt: Date }> {
    return await this.userSecretsService.deleteSecret(userId, slug);
  }

  @ApiOperation({ summary: 'Get secret audit log' })
  @ApiResponse({
    status: 200,
    description: 'Returns audit log for the secret.',
    type: AuditLogResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'You don\'t have permission to view this audit log.',
  })
  @ApiResponse({
    status: 404,
    description: 'Secret not found.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @Get('/secrets/:slug/audit-log')
  async getAuditLog(
    @UserId() userId: string,
    @Param('slug') slug: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ): Promise<AuditLogResponseDto> {
    return await this.userSecretsService.getAuditLog(userId, slug, {
      page: page || 1,
      limit: limit || 50,
    });
  }
}
