import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { IGlobalDatabaseContext } from '../common/application/global-database-context.interface.js';
import { BaseType } from '../common/data-injection.tokens.js';
import { IRequestWithCognitoInfo } from '../authorization/cognito-decoded.interface.js';
import { Messages } from '../exceptions/text/messages.js';
import { ValidationHelper } from '../helpers/validators/validation-helper.js';
import { validateUuidByRegex } from './utils/validate-uuid-by-regex.js';

@Injectable()
export class TablesReceiveGuard implements CanActivate {
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {}

  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    return new Promise(async (resolve, reject) => {
      const request: IRequestWithCognitoInfo = context.switchToHttp().getRequest();
      const cognitoUserName = request.decoded.sub;
      const connectionId: string = request.params?.slug || request.params?.connectionId;
      if (!connectionId || (!validateUuidByRegex(connectionId) && !ValidationHelper.isValidNanoId(connectionId))) {
        reject(new BadRequestException(Messages.CONNECTION_ID_MISSING));
        return;
      }
      let canUserReadTables = false;
      try {
        canUserReadTables = await this._dbContext.connectionRepository.isUserFromConnection(
          cognitoUserName,
          connectionId,
        );
      } catch (error) {
        reject(error);
        return;
      }

      if (canUserReadTables) {
        resolve(canUserReadTables);
        return;
      } else {
        reject(new BadRequestException(Messages.CONNECTION_NOT_FOUND));
      }
    });
  }
}
