import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { IRequestWithCognitoInfo } from '../authorization/index.js';
import { IGlobalDatabaseContext } from '../common/application/global-database-context.interface.js';
import { BaseType } from '../common/data-injection.tokens.js';
import { Messages } from '../exceptions/text/messages.js';
import { getMasterPwd } from '../helpers/index.js';
import { validateUuidByRegex } from './utils/validate-uuid-by-regex.js';
import { ValidationHelper } from '../helpers/validators/validation-helper.js';

@Injectable()
export class TableDeleteGuard implements CanActivate {
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {}

  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    return new Promise(async (resolve, reject) => {
      const request: IRequestWithCognitoInfo = context.switchToHttp().getRequest();
      const cognitoUserName = request.decoded.sub;
      const connectionId: string = request.params?.slug || request.params?.connectionId;
      const tableName: string = request.query?.tableName;
      const masterPwd = getMasterPwd(request);
      if (!tableName) {
        reject(new BadRequestException(Messages.TABLE_NAME_MISSING));
        return;
      }
      if (!connectionId || (!validateUuidByRegex(connectionId) && !ValidationHelper.isValidNanoId(connectionId))) {
        reject(new BadRequestException(Messages.CONNECTION_ID_MISSING));
        return;
      }
      let userTableDelete = false;
      try {
        userTableDelete = await this._dbContext.userAccessRepository.checkTableDelete(
          cognitoUserName,
          connectionId,
          tableName,
          masterPwd,
        );
      } catch (e) {
        reject(e);
        return;
      }
      if (userTableDelete) {
        resolve(userTableDelete);
      } else {
        reject(new ForbiddenException(Messages.DONT_HAVE_PERMISSIONS));
        return;
      }
    });
  }
}
