import { Inject, Injectable } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.intarface';
import { BaseType } from '../../../common/data-injection.tokens';
import { Encryptor } from '../../../helpers/encryption/encryptor';
import { IValidateConnectionToken } from './use-cases.interfaces';

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
