import { Inject, Injectable, Scope } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case';
import { UpdateMasterPasswordDs } from '../application/data-structures/update-master-password.ds';
import { IUpdateMasterPassword } from './use-cases.interfaces';
import { BaseType } from '../../../common/data-injection.tokens';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.intarface';
import { Encryptor } from '../../../helpers/encryption/encryptor';

@Injectable()
export class UpdateConnectionMasterPasswordUseCase
  extends AbstractUseCase<UpdateMasterPasswordDs, boolean>
  implements IUpdateMasterPassword
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }

  protected async implementation(inputData: UpdateMasterPasswordDs): Promise<boolean> {
    const { connectionId, newMasterPwd, oldMasterPwd } = inputData;
    let connection = await this._dbContext.connectionRepository.findAndDecryptConnection(connectionId, oldMasterPwd);
    connection = Encryptor.encryptConnectionCredentials(connection, newMasterPwd);
    const updatedConnection = await this._dbContext.connectionRepository.saveNewConnection(connection);
    return !!updatedConnection;
  }
}
