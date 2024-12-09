import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { ICreateThreadWithAIAssistant } from '../ai-use-cases.interface.js';
import { CreateThreadWithAssistantDS } from '../application/data-structures/create-thread-with-assistant.ds.js';
import { CreatedThreadWithAssistantDS } from '../application/data-structures/created-thread-with-assistant.ds.js';
import { getRequiredEnvVariable } from '../../../helpers/app/get-requeired-env-variable.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { isConnectionTypeAgent } from '../../../helpers/is-connection-entity-agent.js';
import { Messages } from '../../../exceptions/text/messages.js';

@Injectable()
export class CreateThreadWithAIAssistantUseCase
  extends AbstractUseCase<CreateThreadWithAssistantDS, CreatedThreadWithAssistantDS>
  implements ICreateThreadWithAIAssistant
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }

  public async implementation(inputData: CreateThreadWithAssistantDS): Promise<CreatedThreadWithAssistantDS> {
    const openAIKey = getRequiredEnvVariable('OPENAI_API_KEY');
    const openAIAssistantId = getRequiredEnvVariable('OPENAI_ASSISTANT_ID');

    const { connectionId, tableName, master_password, user_id } = inputData;

    const foundConnection = await this._dbContext.connectionRepository.findAndDecryptConnection(
      connectionId,
      master_password,
    );

    if (!foundConnection) {
      throw new NotFoundException(Messages.CONNECTION_NOT_FOUND);
    }

    let userEmail: string;
    if (isConnectionTypeAgent(foundConnection.type)) {
      userEmail = await this._dbContext.userRepository.getUserEmailOrReturnNull(user_id);
    }

    const connectionProperties =
      await this._dbContext.connectionPropertiesRepository.findConnectionProperties(connectionId);

    if (connectionProperties && !connectionProperties.allow_ai_requests) {
      throw new BadRequestException(Messages.AI_REQUESTS_NOT_ALLOWED);
    }

    return null;
  }
}
