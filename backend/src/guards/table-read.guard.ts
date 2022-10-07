import { CanActivate, ExecutionContext, Inject, Injectable } from '@nestjs/common';
import { Observable } from 'rxjs';
import { IRequestWithCognitoInfo } from '../authorization';
import { IGlobalDatabaseContext } from '../common/application/global-database-context.intarface';
import { BaseType } from '../common/data-injection.tokens';
import { Messages } from '../exceptions/text/messages';
import { getMasterPwd } from '../helpers';
import { buildBadRequestException, buildForbiddenException } from './utils';
import { validateUuidByRegex } from './utils/validate-uuid-by-regex';

@Injectable()
export class TableReadGuard implements CanActivate {
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {}

  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    return new Promise(async (resolve, reject) => {
      const request: IRequestWithCognitoInfo = context.switchToHttp().getRequest();
      const cognitoUserName = request.decoded.sub;
      const connectionId: string = request.params?.slug;
      const tableName: string = request.query?.tableName;
      const masterPwd = getMasterPwd(request);
      if (!tableName) {
        reject(buildBadRequestException(Messages.TABLE_NAME_MISSING));
        return;
      }
      if (!connectionId || !validateUuidByRegex(connectionId)) {
        reject(buildBadRequestException(Messages.CONNECTION_ID_MISSING));
        return;
      }
      let userTableRead = false;
      try {
        userTableRead = await this._dbContext.userAccessRepository.checkTableRead(
          cognitoUserName,
          connectionId,
          tableName,
          masterPwd,
        );
      } catch (e) {
        reject(e);
        return;
      }
      if (userTableRead) {
        resolve(userTableRead);
        return;
      } else {
        reject(buildForbiddenException(Messages.DONT_HAVE_PERMISSIONS));
        return;
      }
    });
  }
}
