import { Inject, Injectable, NotFoundException, Scope } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { IDeleteThreadWithAIAssistant } from '../ai-use-cases.interface.js';
import { FindAllThreadMessagesDS } from '../application/data-structures/find-all-thread-messages.ds.js';
import { SuccessResponse } from '../../../microservices/saas-microservice/data-structures/common-responce.ds.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { getOpenAiClient } from '../utils/get-open-ai-client.js';

@Injectable({ scope: Scope.REQUEST })
export class DeleteThreadWithAIAssistantUseCase
  extends AbstractUseCase<FindAllThreadMessagesDS, SuccessResponse>
  implements IDeleteThreadWithAIAssistant
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }

  public async implementation(inputData: FindAllThreadMessagesDS): Promise<SuccessResponse> {
    const { threadId, userId } = inputData;
    const foundThread = await this._dbContext.aiUserThreadsRepository.findThreadByIdAndUserId(threadId, userId);
    if (!foundThread) {
      throw new NotFoundException(Messages.AI_THREAD_NOT_FOUND);
    }

    const { openai } = getOpenAiClient();

    await openai.beta.threads.del(foundThread.thread_ai_id);
    await this._dbContext.aiUserThreadsRepository.delete(foundThread.id);

    return {
      success: true,
    };
  }
}
