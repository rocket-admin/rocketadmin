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
import { validateUuidByRegex } from './utils/validate-uuid-by-regex.js';

@Injectable()
export class ConnectionReadGuard implements CanActivate {
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {}

  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    return new Promise(async (resolve, reject) => {
      const request: IRequestWithCognitoInfo = context.switchToHttp().getRequest();
      const cognitoUserName = request.decoded.sub;
      let connectionId: string = request.params?.slug || request.params?.connectionId;
      if (!connectionId || !validateUuidByRegex(connectionId)) {
        connectionId = request.query['connectionId'];
      }
      if (!connectionId || !validateUuidByRegex(connectionId)) {
        reject(new BadRequestException(Messages.CONNECTION_ID_MISSING));
        return;
      }
      let userConnectionRead = false;
      try {
        userConnectionRead = await this._dbContext.userAccessRepository.checkUserConnectionRead(
          cognitoUserName,
          connectionId,
        );
      } catch (e) {
        reject(e);
        return;
      }
      if (userConnectionRead) {
        resolve(true);
        return;
      } else {
        reject(new ForbiddenException(Messages.DONT_HAVE_PERMISSIONS));
        return;
      }
    });
  }
}
