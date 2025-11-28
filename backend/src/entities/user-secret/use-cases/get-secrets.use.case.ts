import { ForbiddenException, Inject, Injectable, Scope } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { GetSecretsDS, SecretsListDS } from '../application/data-structures/get-secrets.ds.js';
import { IGetSecrets } from './user-secret-use-cases.interface.js';
import { buildSecretListItemDS } from '../utils/build-secret-list-item.ds.js';

@Injectable({ scope: Scope.REQUEST })
export class GetSecretsUseCase extends AbstractUseCase<GetSecretsDS, SecretsListDS> implements IGetSecrets {
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }

  protected async implementation(inputData: GetSecretsDS): Promise<SecretsListDS> {
    const { userId, page, limit, search } = inputData;

    const user = await this._dbContext.userRepository.findOne({
      where: { id: userId },
      relations: ['company'],
    });

    if (!user || !user.company) {
      throw new ForbiddenException('User not found or not associated with a company');
    }

    const [secrets, total] = await this._dbContext.userSecretRepository.findSecretsForCompany(user.company.id, {
      page,
      limit,
      search,
    });

    return {
      data: secrets.map((secret) => buildSecretListItemDS(secret)),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
