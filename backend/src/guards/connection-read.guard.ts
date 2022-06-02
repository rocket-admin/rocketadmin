import { CanActivate, ExecutionContext, forwardRef, Inject, Injectable } from '@nestjs/common';
import { Observable } from 'rxjs';
import { IRequestWithCognitoInfo } from '../authorization';
import { UserAccessService } from '../entities/user-access/user-access.service';
import { Messages } from '../exceptions/text/messages';
import { buildBadRequestException, buildForbiddenException } from './utils';
import { validateUuidByRegex } from './utils/validate-uuid-by-regex';

@Injectable()
export class ConnectionReadGuard implements CanActivate {
  constructor(
    @Inject(forwardRef(() => UserAccessService))
    private readonly userAccessService: UserAccessService,
  ) {}

  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    return new Promise(async (resolve, reject) => {
      const request: IRequestWithCognitoInfo = context.switchToHttp().getRequest();
      const cognitoUserName = request.decoded.sub;
      let connectionId: string = request.params?.slug;
      if (!connectionId || !validateUuidByRegex(connectionId)) {
        connectionId = request.query['connectionId'];
      }
      if (!connectionId || !validateUuidByRegex(connectionId)) {
        reject(buildBadRequestException(Messages.CONNECTION_ID_MISSING));
        return;
      }
      let userConnectionRead = false;
      try {
        userConnectionRead = await this.userAccessService.checkUserConnectionRead(cognitoUserName, connectionId);
      } catch (e) {
        reject(e);
        return;
      }
      if (userConnectionRead) {
        resolve(true);
        return;
      } else {
        reject(buildForbiddenException(Messages.DONT_HAVE_PERMISSIONS));
        return;
      }
    });
  }
}
