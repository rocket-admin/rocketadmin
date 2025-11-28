import { ConflictException, ForbiddenException, Inject, Injectable, Scope } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { CreateSecretDS } from '../application/data-structures/create-secret.ds.js';
import { CreatedSecretDS } from '../application/data-structures/created-secret.ds.js';
import { ICreateSecret } from './user-secret-use-cases.interface.js';
import { buildCreatedSecretDS } from '../utils/build-created-secret.ds.js';
import { Encryptor } from '../../../helpers/encryption/encryptor.js';
import { SecretActionEnum } from '../../secret-access-log/secret-access-log.entity.js';

@Injectable({ scope: Scope.REQUEST })
export class CreateSecretUseCase extends AbstractUseCase<CreateSecretDS, CreatedSecretDS> implements ICreateSecret {
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }

  protected async implementation(inputData: CreateSecretDS): Promise<CreatedSecretDS> {
    const { userId, slug, value, expiresAt, masterEncryption, masterPassword } = inputData;

    const user = await this._dbContext.userRepository.findOne({
      where: { id: userId },
      relations: ['company'],
    });

    if (!user || !user.company) {
      throw new ForbiddenException('User not found or not associated with a company');
    }

    const existing = await this._dbContext.userSecretRepository.findSecretBySlugAndCompanyId(slug, user.company.id);

    if (existing) {
      throw new ConflictException('Secret with this slug already exists in your company');
    }

    let encryptedValue = value;

    if (masterEncryption && masterPassword) {
      encryptedValue = Encryptor.encryptDataMasterPwd(encryptedValue, masterPassword);
    }

    encryptedValue = Encryptor.encryptData(encryptedValue);

    const masterHash = masterPassword ? await Encryptor.hashUserPassword(masterPassword) : null;

    const secret = this._dbContext.userSecretRepository.create({
      slug,
      encryptedValue,
      companyId: user.company.id,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      masterEncryption: masterEncryption || false,
      masterHash,
    });

    const saved = await this._dbContext.userSecretRepository.save(secret);

    await this._dbContext.secretAccessLogRepository.createAccessLog(saved.id, userId, SecretActionEnum.CREATE);

    return buildCreatedSecretDS(saved);
  }
}
