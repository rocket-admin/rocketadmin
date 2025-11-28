import { ForbiddenException, Inject, Injectable, NotFoundException, Scope } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { DeleteSecretDS, DeletedSecretDS } from '../application/data-structures/delete-secret.ds.js';
import { IDeleteSecret } from './user-secret-use-cases.interface.js';
import { SecretActionEnum } from '../../secret-access-log/secret-access-log.entity.js';

@Injectable({ scope: Scope.REQUEST })
export class DeleteSecretUseCase extends AbstractUseCase<DeleteSecretDS, DeletedSecretDS> implements IDeleteSecret {
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }

  protected async implementation(inputData: DeleteSecretDS): Promise<DeletedSecretDS> {
    const { userId, slug } = inputData;

    const user = await this._dbContext.userRepository.findOne({
      where: { id: userId },
      relations: ['company'],
    });

    if (!user || !user.company) {
      throw new ForbiddenException('User not found or not associated with a company');
    }

    const secret = await this._dbContext.userSecretRepository.findSecretBySlugAndCompanyId(slug, user.company.id);

    if (!secret) {
      throw new NotFoundException('Secret not found');
    }

    await this._dbContext.secretAccessLogRepository.createAccessLog(secret.id, userId, SecretActionEnum.DELETE);

    await this._dbContext.userSecretRepository.remove(secret);

    return {
      message: 'Secret deleted successfully',
      deletedAt: new Date(),
    };
  }
}
