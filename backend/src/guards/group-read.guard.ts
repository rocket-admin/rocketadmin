import { CanActivate, ExecutionContext, Inject, Injectable } from '@nestjs/common';
import { Observable } from 'rxjs';
import { IRequestWithCognitoInfo } from '../authorization';
import { Messages } from '../exceptions/text/messages';
import { buildBadRequestException, buildForbiddenException } from './utils';
import { validateUuidByRegex } from './utils/validate-uuid-by-regex';
import { BaseType } from '../common/data-injection.tokens';
import { IGlobalDatabaseContext } from '../common/application/global-database-context.intarface';

@Injectable()
export class GroupReadGuard implements CanActivate {
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {}

  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    return new Promise(async (resolve, reject) => {
      const request: IRequestWithCognitoInfo = context.switchToHttp().getRequest();
      const cognitoUserName = request.decoded.sub;
      let groupId: string = request.params?.slug;
      if (!groupId || !validateUuidByRegex(groupId)) {
        groupId = request.body['groupId'];
      }
      if (!groupId || !validateUuidByRegex(groupId)) {
        reject(buildBadRequestException(Messages.GROUP_ID_MISSING));
        return;
      }
      let userGroupRead = false;
      try {
        userGroupRead = await this._dbContext.userAccessRepository.checkUserGroupRead(cognitoUserName, groupId);
      } catch (e) {
        reject(e);
        return;
      }
      if (userGroupRead) {
        resolve(true);
        return;
      } else {
        reject(buildForbiddenException(Messages.DONT_HAVE_PERMISSIONS));
        return;
      }
    });
  }
}
