import { ForbiddenException, Inject, Injectable, NotFoundException, Scope } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { AuditLogListDS, GetAuditLogDS } from '../application/data-structures/get-audit-log.ds.js';
import { IGetSecretAuditLog } from './user-secret-use-cases.interface.js';
import { buildAuditLogEntryDS } from '../utils/build-audit-log-entry.ds.js';
import { Messages } from '../../../exceptions/text/messages.js';

@Injectable({ scope: Scope.REQUEST })
export class GetSecretAuditLogUseCase
  extends AbstractUseCase<GetAuditLogDS, AuditLogListDS>
  implements IGetSecretAuditLog
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }

  protected async implementation(inputData: GetAuditLogDS): Promise<AuditLogListDS> {
    const { userId, slug, page, limit } = inputData;

    const user = await this._dbContext.userRepository.findOne({
      where: { id: userId },
      relations: ['company'],
    });

    if (!user || !user.company) {
      throw new ForbiddenException(Messages.USER_NOT_FOUND_OR_NOT_IN_COMPANY);
    }

    const secret = await this._dbContext.userSecretRepository.findSecretBySlugAndCompanyId(slug, user.company.id);

    if (!secret) {
      throw new NotFoundException(Messages.SECRET_NOT_FOUND);
    }

    const [logs, total] = await this._dbContext.secretAccessLogRepository.findLogsForSecret(secret.id, {
      page,
      limit,
    });

    return {
      data: logs.map((log) => buildAuditLogEntryDS(log)),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
