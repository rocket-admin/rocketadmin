import { Inject, Injectable } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { FoundApiKeyDS } from '../application/dto/found-api-key.ds.js';
import { IGetApiKeys } from './api-key-use-cases.interface.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { buildFoundApiKeyDS } from '../utils/build-found-api-key.ds.js';

@Injectable()
export class GetAllUserApiKeysUseCase extends AbstractUseCase<string, Array<FoundApiKeyDS>> implements IGetApiKeys {
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }

  protected async implementation(userId: string): Promise<Array<FoundApiKeyDS>> {
    const foundApiKeys = await this._dbContext.userApiKeysRepository.findApiKeysByUserId(userId);
    return foundApiKeys.map((apiKey) => buildFoundApiKeyDS(apiKey));
  }
}
