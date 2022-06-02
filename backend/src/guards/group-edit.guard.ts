import { CanActivate, ExecutionContext, forwardRef, Inject, Injectable } from '@nestjs/common';
import { Observable } from 'rxjs';
import { IRequestWithCognitoInfo } from '../authorization';
import { UserAccessService } from '../entities/user-access/user-access.service';
import { Messages } from '../exceptions/text/messages';
import { buildBadRequestException, buildForbiddenException } from './utils';
import { validateUuidByRegex } from './utils/validate-uuid-by-regex';

@Injectable()
export class GroupEditGuard implements CanActivate {
  constructor(
    @Inject(forwardRef(() => UserAccessService))
    private readonly userAccessService: UserAccessService,
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
      let userGroupEdit = false;
      try {
        userGroupEdit = await this.userAccessService.checkUserGroupEdit(cognitoUserName, groupId);
      } catch (e) {
        reject(e);
        return;
      }

      if (userGroupEdit) {
        resolve(true);
        return;
      } else {
        reject(buildForbiddenException(Messages.DONT_HAVE_PERMISSIONS));
        return;
      }
    });
  }
}
