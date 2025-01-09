import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGetAllThreadMessages } from '../ai-use-cases.interface.js';
import { FoundUserThreadMessagesRO } from '../application/dto/found-user-thread-messages.ro.js';
import { FindAllThreadMessagesDS } from '../application/data-structures/find-all-thread-messages.ds.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { getOpenAiClient } from '../utils/get-open-ai-client.js';
import { MessagesPage } from 'openai/resources/beta/threads/messages.js';
import { buildFoundUserThreadMessagesRO } from '../utils/build-found-user-thread-messages-ro.util.js';

@Injectable()
export class FindAllMessagesInAiThreadUseCase
  extends AbstractUseCase<FindAllThreadMessagesDS, Array<FoundUserThreadMessagesRO>>
  implements IGetAllThreadMessages
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }

  public async implementation(inputData: FindAllThreadMessagesDS): Promise<Array<FoundUserThreadMessagesRO>> {
    const { threadId, userId, limit } = inputData;
    const foundThread = await this._dbContext.aiUserThreadsRepository.findThreadByIdAndUserId(threadId, userId);
    if (!foundThread) {
      throw new NotFoundException(Messages.AI_THREAD_NOT_FOUND);
    }

    const { openai } = getOpenAiClient();

    const messages: MessagesPage = await openai.beta.threads.messages.list(foundThread.thread_ai_id, {
      limit,
    });
    return messages.data.map((message) => buildFoundUserThreadMessagesRO(message));
  }
}
