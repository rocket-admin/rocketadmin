import { Inject, Injectable, NotFoundException, Scope } from '@nestjs/common';
import { CreateApiKeyDS } from '../application/data-structures/create-api-key.ds.js';
import { CreatedApiKeyDS } from '../application/data-structures/created-api-key.ds.js';
import { ICreateApiKey } from './api-key-use-cases.interface.js';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { buildNewApiKeyEntity } from '../utils/build-new-api-key-entity.js';
import { buildCreatedApiKeyDS } from '../utils/build-created-api-key-ds.js';

@Injectable({ scope: Scope.REQUEST })
export class CreateApiKeyUseCase extends AbstractUseCase<CreateApiKeyDS, CreatedApiKeyDS> implements ICreateApiKey {
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }

  protected async implementation(inputData: CreateApiKeyDS): Promise<CreatedApiKeyDS> {
    const { userId } = inputData;
    const foundUser = await this._dbContext.userRepository.findOneUserById(userId);
    if (!foundUser) {
      throw new NotFoundException(Messages.USER_NOT_FOUND);
    }
    const newApiKey = buildNewApiKeyEntity(inputData);
    newApiKey.user = foundUser;
    const hashOriginal = newApiKey.hash;
    const createdApiKey = await this._dbContext.userApiKeysRepository.save(newApiKey);
    createdApiKey.hash = hashOriginal;
    return buildCreatedApiKeyDS(createdApiKey);
  }
}
