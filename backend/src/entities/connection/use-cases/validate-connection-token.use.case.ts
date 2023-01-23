import { Inject, Injectable } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.intarface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { Encryptor } from '../../../helpers/encryption/encryptor.js';
import { IValidateConnectionToken } from './use-cases.interfaces.js';

@Injectable()
export class ValidateConnectionTokenUseCase
  extends AbstractUseCase<string, boolean>
  implements IValidateConnectionToken
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }

  protected async implementation(connectionToken: string): Promise<boolean> {
    connectionToken = Encryptor.hashDataHMAC(connectionToken);
    const foundConnection = await this._dbContext.connectionRepository.findOneAgentConnectionByToken(connectionToken);
    return !!foundConnection;
  }
}
