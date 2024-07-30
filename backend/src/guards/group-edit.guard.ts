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
export class GroupEditGuard implements CanActivate {
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {}

  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    return new Promise(async (resolve, reject) => {
      const request: IRequestWithCognitoInfo = context.switchToHttp().getRequest();
      const cognitoUserName = request.decoded.sub;
      let groupId: string = request.params?.groupId || request.params?.slug;
      if (!groupId || !validateUuidByRegex(groupId)) {
        groupId = request.body['groupId'];
      }
      if (!groupId || !validateUuidByRegex(groupId)) {
        reject(new BadRequestException(Messages.GROUP_ID_MISSING));
        return;
      }
      let userGroupEdit = false;
      try {
        userGroupEdit = await this._dbContext.userAccessRepository.checkUserGroupEdit(cognitoUserName, groupId);
      } catch (e) {
        reject(e);
        return;
      }

      if (userGroupEdit) {
        resolve(true);
        return;
      } else {
        reject(new ForbiddenException(Messages.DONT_HAVE_PERMISSIONS));
        return;
      }
    });
  }
}
