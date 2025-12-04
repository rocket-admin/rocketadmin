import { ForbiddenException, GoneException, Inject, Injectable, NotFoundException, Scope } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { UpdateSecretDS, UpdatedSecretDS } from '../application/data-structures/update-secret.ds.js';
import { IUpdateSecret } from './user-secret-use-cases.interface.js';
import { buildUpdatedSecretDS } from '../utils/build-updated-secret.ds.js';
import { Encryptor } from '../../../helpers/encryption/encryptor.js';
import { SecretActionEnum } from '../../secret-access-log/secret-access-log.entity.js';
import { Messages } from '../../../exceptions/text/messages.js';

@Injectable({ scope: Scope.REQUEST })
export class UpdateSecretUseCase extends AbstractUseCase<UpdateSecretDS, UpdatedSecretDS> implements IUpdateSecret {
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }

  protected async implementation(inputData: UpdateSecretDS): Promise<UpdatedSecretDS> {
    const { userId, slug, value, expiresAt, masterPassword } = inputData;

    const user = await this._dbContext.userRepository.findOne({
      where: { id: userId },
      relations: ['company'],
    });

    if (!user || !user.company) {
      throw new NotFoundException(Messages.USER_NOT_FOUND_OR_NOT_IN_COMPANY);
    }

    const secret = await this._dbContext.userSecretRepository.findSecretBySlugAndCompanyId(slug, user.company.id);

    if (!secret) {
      throw new NotFoundException(Messages.SECRET_NOT_FOUND);
    }

    if (secret.expiresAt && secret.expiresAt < new Date()) {
      throw new GoneException(Messages.SECRET_EXPIRED);
    }

    if (secret.masterEncryption && !masterPassword) {
      throw new ForbiddenException(Messages.SECRET_MASTER_PASSWORD_REQUIRED);
    }

    if (secret.masterEncryption && masterPassword) {
      const isValid = await Encryptor.verifyUserPassword(masterPassword, secret.masterHash);
      if (!isValid) {
        await this._dbContext.secretAccessLogRepository.createAccessLog(
          secret.id,
          userId,
          SecretActionEnum.UPDATE,
          false,
          Messages.SECRET_MASTER_PASSWORD_INVALID,
        );
        throw new ForbiddenException(Messages.SECRET_MASTER_PASSWORD_INVALID);
      }
    }

    if (value) {
      let encryptedValue = value;

      if (secret.masterEncryption && masterPassword) {
        encryptedValue = Encryptor.encryptDataMasterPwd(encryptedValue, masterPassword);
      }

      encryptedValue = Encryptor.encryptData(encryptedValue);
      secret.encryptedValue = encryptedValue;
    }

    if (expiresAt !== undefined) {
      secret.expiresAt = expiresAt ? new Date(expiresAt) : null;
    }

    const updated = await this._dbContext.userSecretRepository.save(secret);

    await this._dbContext.secretAccessLogRepository.createAccessLog(secret.id, userId, SecretActionEnum.UPDATE);

    return buildUpdatedSecretDS(updated);
  }
}
