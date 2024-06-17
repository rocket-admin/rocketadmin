import { UseInterceptors, Controller, Injectable, Inject, Post, Body } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SentryInterceptor } from '../../interceptors/sentry.interceptor.js';
import { UseCaseType } from '../../common/data-injection.tokens.js';
import { ICreateApiKey } from './use-cases/api-key-use-cases.interface.js';
import { UserId } from '../../decorators/user-id.decorator.js';
import { CreateApiKeyDto } from './application/dto/create-api-key.dto.js';
import { InTransactionEnum } from '../../enums/in-transaction.enum.js';
import { CreatedApiKeyDto } from './application/dto/created-api-key.dto.js';
import { buildCreatedApiKeyDto } from './utils/build-created-api-key.dto.js';

@UseInterceptors(SentryInterceptor)
@Controller('apikey')
@ApiBearerAuth()
@ApiTags('apikey')
@Injectable()
export class ApiKeyController {
  constructor(
    @Inject(UseCaseType.CREATE_API_KEY)
    private readonly createApiKeyUseCase: ICreateApiKey,
  ) {}

  @ApiOperation({ summary: 'Create new API key' })
  @ApiResponse({
    status: 200,
    description: 'Api key created.',
    type: CreatedApiKeyDto,
  })
  @Post('/')
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
}
