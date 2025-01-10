import {
  UseInterceptors,
  Controller,
  Injectable,
  Inject,
  UseGuards,
  Post,
  Body,
  Res,
  Get,
  Delete,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SentryInterceptor } from '../../interceptors/sentry.interceptor.js';
import { UseCaseType } from '../../common/data-injection.tokens.js';
import {
  IAddMessageToThreadWithAIAssistant,
  ICreateThreadWithAIAssistant,
  IDeleteThreadWithAIAssistant,
  IGetAllThreadMessages,
  IGetAllUserThreadsWithAIAssistant,
} from './ai-use-cases.interface.js';
import { ConnectionEditGuard } from '../../guards/connection-edit.guard.js';
import { CreateThreadWithAIAssistantBodyDTO } from './application/dto/create-thread-with-ai-assistant-body.dto.js';
import { CreateThreadWithAssistantDS } from './application/data-structures/create-thread-with-assistant.ds.js';
import { SlugUuid } from '../../decorators/slug-uuid.decorator.js';
import { QueryTableName } from '../../decorators/query-table-name.decorator.js';
import { MasterPassword } from '../../decorators/master-password.decorator.js';
import { UserId } from '../../decorators/user-id.decorator.js';
import { InTransactionEnum } from '../../enums/in-transaction.enum.js';
import { Response } from 'express';
import { AddMessageToThreadWithAssistantDS } from './application/data-structures/add-message-to-thread-with-assistant.ds.js';
import { FoundUserThreadsWithAiRO } from './application/dto/found-user-threads-with-ai.ro.js';
import { FoundUserThreadMessagesRO } from './application/dto/found-user-thread-messages.ro.js';
import { FindAllThreadMessagesDS } from './application/data-structures/find-all-thread-messages.ds.js';
import { SuccessResponse } from '../../microservices/saas-microservice/data-structures/common-responce.ds.js';
import { DeleteThreadWithAssistantDS } from './application/data-structures/delete-thread-with-assistant.ds.js';

@UseInterceptors(SentryInterceptor)
@Controller()
@ApiBearerAuth()
@ApiTags('ai threads')
@Injectable()
export class UserAIThreadsController {
  constructor(
    @Inject(UseCaseType.CREATE_THREAD_WITH_AI_ASSISTANT)
    private readonly createThreadWithAIAssistantUseCase: ICreateThreadWithAIAssistant,
    @Inject(UseCaseType.ADD_MESSAGE_TO_THREAD_WITH_AI_ASSISTANT)
    private readonly addMessageToThreadWithAIAssistantUseCase: IAddMessageToThreadWithAIAssistant,
    @Inject(UseCaseType.GET_ALL_USER_THREADS_WITH_AI_ASSISTANT)
    private readonly getAllUserThreadsWithAIAssistantUseCase: IGetAllUserThreadsWithAIAssistant,
    @Inject(UseCaseType.GET_ALL_THREAD_MESSAGES)
    private readonly getAllThreadMessagesUseCase: IGetAllThreadMessages,
    @Inject(UseCaseType.DELETE_THREAD_WITH_AI_ASSISTANT)
    private readonly deleteThreadWithAIAssistantUseCase: IDeleteThreadWithAIAssistant,
  ) {}

  @ApiOperation({ summary: 'Create new thread with ai assistant' })
  @ApiResponse({
    status: 201,
    description: 'Return ai assistant response text as stream.',
  })
  @UseGuards(ConnectionEditGuard)
  @ApiBody({ type: CreateThreadWithAIAssistantBodyDTO })
  @ApiQuery({ name: 'tableName', required: true, type: String })
  @Post('/ai/thread/:connectionId')
  public async createThreadWithAIAssistant(
    @SlugUuid('connectionId') connectionId: string,
    @QueryTableName() tableName: string,
    @MasterPassword() masterPassword: string,
    @UserId() userId: string,
    @Body() requestData: CreateThreadWithAIAssistantBodyDTO,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    const inputData: CreateThreadWithAssistantDS = {
      connectionId,
      tableName,
      master_password: masterPassword,
      user_id: userId,
      user_message: requestData.user_message,
      response,
    };

    return await this.createThreadWithAIAssistantUseCase.execute(inputData, InTransactionEnum.OFF);
  }

  @ApiOperation({ summary: 'Add new message to thread with assistant' })
  @ApiResponse({
    status: 201,
    description: 'Return ai assistant response text as stream.',
  })
  @UseGuards(ConnectionEditGuard)
  @ApiBody({ type: CreateThreadWithAIAssistantBodyDTO })
  @ApiQuery({ name: 'tableName', required: true, type: String })
  @Post('/ai/thread/message/:connectionId/:threadId')
  public async addMessageToThreadWithAIAssistant(
    @SlugUuid('connectionId') connectionId: string,
    @QueryTableName() tableName: string,
    @SlugUuid('threadId') threadId: string,
    @MasterPassword() masterPassword: string,
    @UserId() userId: string,
    @Body() requestData: CreateThreadWithAIAssistantBodyDTO,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    const inputData: AddMessageToThreadWithAssistantDS = {
      connectionId,
      tableName,
      master_password: masterPassword,
      threadId,
      user_id: userId,
      user_message: requestData.user_message,
      response,
    };
    return await this.addMessageToThreadWithAIAssistantUseCase.execute(inputData, InTransactionEnum.OFF);
  }

  @ApiOperation({ summary: 'Get all user threads with assistant' })
  @ApiResponse({
    status: 201,
    description: 'Return user threads.',
    type: FoundUserThreadsWithAiRO,
  })
  @Get('/ai/threads')
  public async findUserThreadsWithAssistant(@UserId() userId: string): Promise<Array<FoundUserThreadsWithAiRO>> {
    return await this.getAllUserThreadsWithAIAssistantUseCase.execute(userId, InTransactionEnum.OFF);
  }

  @ApiOperation({ summary: 'Get all messages from a thread' })
  @ApiResponse({
    status: 201,
    description: 'Return messages from a thread.',
    type: FoundUserThreadMessagesRO,
    isArray: true,
  })
  @ApiQuery({ name: 'limit', required: false })
  @Get('/ai/thread/messages/:threadId')
  public async getUserMessagesFromThread(
    @UserId() userId: string,
    @SlugUuid('threadId') threadId: string,
    @Query('limit') limit: string,
  ): Promise<Array<FoundUserThreadMessagesRO>> {
    let parsedLimit: number;
    if (limit) {
      parsedLimit = parseInt(limit);
    }
    if (!parsedLimit) {
      parsedLimit = 10;
    }

    const inputData: FindAllThreadMessagesDS = {
      threadId,
      userId,
      limit: parsedLimit,
    };
    return await this.getAllThreadMessagesUseCase.execute(inputData, InTransactionEnum.OFF);
  }

  @ApiOperation({ summary: 'Delete users thread with ai assistant' })
  @ApiResponse({
    status: 201,
    description: 'Delete users thread.',
    type: SuccessResponse,
    isArray: true,
  })
  @Delete('/ai/thread/:threadId')
  public async deleteThreadWithAssistant(
    @UserId() userId: string,
    @SlugUuid('threadId') threadId: string,
  ): Promise<SuccessResponse> {
    const inputData: DeleteThreadWithAssistantDS = {
      threadId,
      userId,
    };
    return await this.deleteThreadWithAIAssistantUseCase.execute(inputData, InTransactionEnum.ON);
  }
}
