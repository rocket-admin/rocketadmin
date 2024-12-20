import { BadRequestException, Inject, Injectable, NotFoundException, Scope } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IAddMessageToThreadWithAIAssistant } from '../ai-use-cases.interface.js';
import { AddMessageToThreadWithAssistantDS } from '../application/data-structures/add-message-to-thread-with-assistant.ds.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { ConnectionTypesEnum } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/enums/connection-types-enum.js';
import { getOpenAiClient } from '../utils/get-open-ai-client.js';
import { AiStreamsRunner } from './use-cases-utils/ai-stream-runner.js';
import { generateMongoDbCommandPrompt, generateSqlQueryPrompt } from '../utils/prompt-generating.util.js';

@Injectable({ scope: Scope.REQUEST })
export class AddMessageToThreadWithAIAssistantUseCase
  extends AbstractUseCase<AddMessageToThreadWithAssistantDS, void>
  implements IAddMessageToThreadWithAIAssistant
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected readonly _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }

  public async implementation(inputData: AddMessageToThreadWithAssistantDS): Promise<void> {
    const { connectionId, threadId, master_password, user_id, user_message, response, tableName } = inputData;

    const foundConnection = await this._dbContext.connectionRepository.findAndDecryptConnection(
      connectionId,
      master_password,
    );
    if (!foundConnection) {
      throw new NotFoundException(Messages.CONNECTION_NOT_FOUND);
    }

    const isMongoDB = foundConnection.type === ConnectionTypesEnum.mongodb;

    const connectionProperties =
      await this._dbContext.connectionPropertiesRepository.findConnectionProperties(connectionId);

    if (connectionProperties && !connectionProperties.allow_ai_requests) {
      throw new BadRequestException(Messages.AI_REQUESTS_NOT_ALLOWED);
    }

    const foundUser = await this._dbContext.userRepository.findOneUserById(user_id);
    const userEmail = foundUser.email;

    const foundUserThread = await this._dbContext.aiUserThreadsRepository.findThreadByIdAndUserId(threadId, user_id);
    if (!foundUserThread) {
      throw new NotFoundException(Messages.AI_THREAD_NOT_FOUND);
    }

    const { openai, assistantId } = getOpenAiClient();

    await openai.beta.threads.messages.create(foundUserThread.thread_ai_id, {
      role: 'user',
      content: user_message,
    });

    const streamRunner: AiStreamsRunner = new AiStreamsRunner(
      openai,
      assistantId,
      foundUserThread.thread_ai_id,
      threadId,

      {
        connection: foundConnection,
        tableName,
        userEmail,
      },
      response,
    );

    const systemPrompt = isMongoDB
      ? generateMongoDbCommandPrompt(tableName, foundConnection)
      : generateSqlQueryPrompt(tableName, foundConnection);

    try {
      await streamRunner.runThread(systemPrompt);
    } catch (_error) {
      response.end(Messages.SOMETHING_WENT_WRONG_AI_THREAD);
    }
  }
}
