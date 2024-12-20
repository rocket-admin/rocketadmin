import { Inject, Injectable } from '@nestjs/common';
import { IGetAllUserThreadsWithAIAssistant } from '../ai-use-cases.interface.js';
import { FoundUserThreadsWithAiRO } from '../application/dto/found-user-threads-with-ai.ro.js';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { buildFoundUserThreadWithAiRO } from '../utils/build-found-user-thread-with-ai-ro.js';

@Injectable()
export class FindAllUserThreadsWithAssistantUseCase
  extends AbstractUseCase<string, Array<FoundUserThreadsWithAiRO>>
  implements IGetAllUserThreadsWithAIAssistant
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }

  public async implementation(userId: string): Promise<Array<FoundUserThreadsWithAiRO>> {
    const foundUserThreads = await this._dbContext.aiUserThreadsRepository.findThreadsByUserId(userId);
    return foundUserThreads.map((thread) => buildFoundUserThreadWithAiRO(thread));
  }
}
