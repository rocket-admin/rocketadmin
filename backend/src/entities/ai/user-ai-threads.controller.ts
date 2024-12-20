import { UseInterceptors, Controller, Injectable, Inject, UseGuards, Post, Body, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SentryInterceptor } from '../../interceptors/sentry.interceptor.js';
import { UseCaseType } from '../../common/data-injection.tokens.js';
import { IAddMessageToThreadWithAIAssistant, ICreateThreadWithAIAssistant } from './ai-use-cases.interface.js';
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
  @ApiQuery({ name: 'threadId', required: true, type: String })
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
}
