import { Inject, Injectable, NotFoundException, Scope } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IDeleteApiKey } from './api-key-use-cases.interface.js';
import { FoundApiKeyDS } from '../application/dto/found-api-key.ds.js';
import { FindApiKeyDS } from '../application/data-structures/find-api-key.ds.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { buildFoundApiKeyDS } from '../utils/build-found-api-key.ds.js';

@Injectable({ scope: Scope.REQUEST })
export class DeleteApiKeyUseCase extends AbstractUseCase<FindApiKeyDS, FoundApiKeyDS> implements IDeleteApiKey {
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }

  public async implementation(apiKeyData: FindApiKeyDS): Promise<FoundApiKeyDS> {
    const { apiKeyId, userId } = apiKeyData;
    const foundApiKey = await this._dbContext.userApiKeysRepository.findApiKeyByIdAndUserId(apiKeyId, userId);
    if (!foundApiKey) {
      throw new NotFoundException(Messages.API_KEY_NOT_FOUND);
    }
    const foundApiKeyCopy = Object.assign({}, foundApiKey);
    await this._dbContext.userApiKeysRepository.remove(foundApiKey);
    return buildFoundApiKeyDS(foundApiKeyCopy);
  }
}
