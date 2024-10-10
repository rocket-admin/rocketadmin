import { UseInterceptors, Controller, Injectable, Inject, Post, Body, Get, Delete } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SentryInterceptor } from '../../interceptors/sentry.interceptor.js';
import { UseCaseType } from '../../common/data-injection.tokens.js';
import { ICreateApiKey, IDeleteApiKey, IGetApiKey, IGetApiKeys } from './use-cases/api-key-use-cases.interface.js';
import { UserId } from '../../decorators/user-id.decorator.js';
import { CreateApiKeyDto } from './application/dto/create-api-key.dto.js';
import { InTransactionEnum } from '../../enums/in-transaction.enum.js';
import { CreatedApiKeyDto } from './application/dto/created-api-key.dto.js';
import { buildCreatedApiKeyDto } from './utils/build-created-api-key.dto.js';
import { FoundApiKeyDto } from './application/dto/found-api-key.dto.js';
import { buildFoundApiKeyDto } from './utils/build-found-api-key.dto.js';
import { SlugUuid } from '../../decorators/slug-uuid.decorator.js';

@UseInterceptors(SentryInterceptor)
@Controller()
@ApiBearerAuth()
@ApiTags('apikey')
@Injectable()
export class ApiKeyController {
  constructor(
    @Inject(UseCaseType.CREATE_API_KEY)
    private readonly createApiKeyUseCase: ICreateApiKey,
    @Inject(UseCaseType.GET_API_KEYS)
    private readonly getApiKeysUseCase: IGetApiKeys,
    @Inject(UseCaseType.GET_API_KEY)
    private readonly getApiKeyUseCase: IGetApiKey,
    @Inject(UseCaseType.DELETE_API_KEY)
    private readonly deleteApiKeyUseCase: IDeleteApiKey,
  ) {}

  @ApiOperation({ summary: 'Create new API key' })
  @ApiResponse({
    status: 200,
    description: 'Api key created.',
    type: CreatedApiKeyDto,
  })
  @Post('/apikey')
  public async createApiKey(@UserId() userId: string, @Body() apiKeyData: CreateApiKeyDto): Promise<CreatedApiKeyDto> {
    const apiKey = await this.createApiKeyUseCase.execute(
      {
        userId,
        title: apiKeyData.title,
      },
      InTransactionEnum.ON,
    );
    return buildCreatedApiKeyDto(apiKey);
  }

  @ApiOperation({ summary: 'Get all user api keys' })
  @ApiResponse({
    status: 200,
    description: 'Get all user api keys.',
    type: FoundApiKeyDto,
    isArray: true,
  })
  @Get('/apikeys')
  public async getApiKeys(@UserId() userId: string): Promise<Array<FoundApiKeyDto>> {
    const foundApiKeys = await this.getApiKeysUseCase.execute(userId);
    return foundApiKeys.map((apiKey) => buildFoundApiKeyDto(apiKey));
  }

  @ApiOperation({ summary: 'Get api key by id' })
  @ApiResponse({
    status: 200,
    description: 'Get api key by id.',
    type: FoundApiKeyDto,
  })
  @Get('/apikey/:apiKeyId')
  public async getApiKey(@UserId() userId: string, @SlugUuid('apiKeyId') apiKeyId: string): Promise<FoundApiKeyDto> {
    const foundApiKey = await this.getApiKeyUseCase.execute({ userId, apiKeyId });
    return buildFoundApiKeyDto(foundApiKey);
  }

  @ApiOperation({ summary: 'Delete api key by id' })
  @ApiResponse({
    status: 200,
    description: 'Get api key by id.',
    type: FoundApiKeyDto,
  })
  @Delete('/apikey/:apiKeyId')
  public async deleteApiKey(@UserId() userId: string, @SlugUuid('apiKeyId') apiKeyId: string): Promise<FoundApiKeyDto> {
    const deletedApiKey = await this.deleteApiKeyUseCase.execute({ userId, apiKeyId }, InTransactionEnum.ON);
    return buildFoundApiKeyDto(deletedApiKey);
  }

  @ApiOperation({ summary: 'Check api key' })
  @ApiResponse({
    status: 200,
    description: 'Api key is valid.',
  })
  @Get('/check/apikey')
  public async checkApiKey(): Promise<any> {
    console.log('Api key is valid');
    return {
      result: true,
      message: 'Api key is valid',
    };
  }
}
