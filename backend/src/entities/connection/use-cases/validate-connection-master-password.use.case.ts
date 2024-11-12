import { Injectable, Scope, Inject, InternalServerErrorException, BadRequestException } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { ValidateConnectionMasterPasswordDs } from '../application/data-structures/validate-connection-master-password.ds.js';
import { ConnectionEntity } from '../connection.entity.js';
import { IValidateConnectionMasterPassword } from './use-cases.interfaces.js';
import { Encryptor } from '../../../helpers/encryption/encryptor.js';
import { TokenValidationResult } from './validate-connection-token.use.case.js';
import { ValidationResultRo } from '../application/dto/validation-result.ro.js';

@Injectable({ scope: Scope.REQUEST })
export class ValidateConnectionMasterPasswordUseCase
  extends AbstractUseCase<ValidateConnectionMasterPasswordDs, ValidationResultRo>
  implements IValidateConnectionMasterPassword
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }
  protected async implementation(
    validateConnectionMasterPasswordData: ValidateConnectionMasterPasswordDs,
  ): Promise<ValidationResultRo> {
    const { connectionId, masterPassword } = validateConnectionMasterPasswordData;
    const connection: ConnectionEntity = await this._dbContext.connectionRepository.findOne({
      where: { id: connectionId },
    });

    if (!connection) {
      throw new InternalServerErrorException(Messages.CONNECTION_NOT_FOUND);
    }

    if (!connection.masterEncryption) {
      throw new BadRequestException(Messages.CONNECTION_NOT_ENCRYPTED);
    }

    if (!connection.master_hash) {
      throw new BadRequestException(Messages.CONNECTION_MASTER_PASSWORD_NOT_SET);
    }
    
    const isMasterPasswordValid = await Encryptor.verifyUserPassword(masterPassword, connection.master_hash);
    return { isValid: isMasterPasswordValid };
  }
}
