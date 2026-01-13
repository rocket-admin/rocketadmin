import { GoneException, Inject, Injectable, NotFoundException, Scope } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { GetSecretDS } from '../application/data-structures/get-secret.ds.js';
import { FoundSecretDS } from '../application/data-structures/found-secret.ds.js';
import { IGetSecretBySlug } from './user-secret-use-cases.interface.js';
import { buildFoundSecretDS } from '../utils/build-found-secret.ds.js';
import { Messages } from '../../../exceptions/text/messages.js';

@Injectable({ scope: Scope.REQUEST })
export class GetSecretBySlugUseCase extends AbstractUseCase<GetSecretDS, FoundSecretDS> implements IGetSecretBySlug {
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }

  protected async implementation(inputData: GetSecretDS): Promise<FoundSecretDS> {
    const { userId, slug } = inputData;

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

    return buildFoundSecretDS(secret);
  }
}
