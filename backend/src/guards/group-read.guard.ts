import { BadRequestException, CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Observable } from 'rxjs';
import { IRequestWithCognitoInfo } from '../authorization/cognito-decoded.interface.js';
import { CedarAction } from '../entities/cedar-authorization/cedar-action-map.js';
import { CedarAuthorizationService } from '../entities/cedar-authorization/cedar-authorization.service.js';
import { Messages } from '../exceptions/text/messages.js';
import { validateUuidByRegex } from './utils/validate-uuid-by-regex.js';

@Injectable()
export class GroupReadGuard implements CanActivate {
	constructor(private readonly cedarAuthService: CedarAuthorizationService) {}

	canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
		return new Promise(async (resolve, reject) => {
			const request: IRequestWithCognitoInfo = context.switchToHttp().getRequest();
			const cognitoUserName = request.decoded.sub;
			let groupId: string = request.params?.groupId || request.params?.slug;
			if (!groupId || !validateUuidByRegex(groupId)) {
				groupId = request.body.groupId;
			}
			if (!groupId || !validateUuidByRegex(groupId)) {
				reject(new BadRequestException(Messages.GROUP_ID_MISSING));
				return;
			}

			try {
				const allowed = await this.cedarAuthService.validate({
					userId: cognitoUserName,
					action: CedarAction.GroupRead,
					groupId,
				});
				if (allowed) {
					resolve(true);
					return;
				}
				reject(new ForbiddenException(Messages.DONT_HAVE_PERMISSIONS));
			} catch (e) {
				reject(e);
			}
		});
	}
}
