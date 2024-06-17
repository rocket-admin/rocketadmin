import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { FindApiKeyDS } from '../application/data-structures/find-api-key.ds.js';
import { FoundApiKeyDS } from '../application/dto/found-api-key.ds.js';
import { IGetApiKey } from './api-key-use-cases.interface.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { buildFoundApiKeyDS } from '../utils/build-found-api-key.ds.js';

@Injectable()
export class GetUserApiKeyUseCase extends AbstractUseCase<FindApiKeyDS, FoundApiKeyDS> implements IGetApiKey {
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }

  protected async implementation(apiKeyData: FindApiKeyDS): Promise<FoundApiKeyDS> {
    const foundApiKey = await this._dbContext.userApiKeysRepository.findApiKeyByIdAndUserId(
      apiKeyData.apiKeyId,
      apiKeyData.userId,
    );
    if (!foundApiKey) {
      throw new NotFoundException(Messages.API_KEY_NOT_FOUND);
    }
    return buildFoundApiKeyDS(foundApiKey);
  }
}
