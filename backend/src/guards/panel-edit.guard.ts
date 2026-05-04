import { BadRequestException, CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Observable } from 'rxjs';
import { IRequestWithCognitoInfo } from '../authorization/cognito-decoded.interface.js';
import { CedarAction } from '../entities/cedar-authorization/cedar-action-map.js';
import { CedarAuthorizationService } from '../entities/cedar-authorization/cedar-authorization.service.js';
import { Messages } from '../exceptions/text/messages.js';
import { ValidationHelper } from '../helpers/validators/validation-helper.js';
import { validateUuidByRegex } from './utils/validate-uuid-by-regex.js';

@Injectable()
export class PanelEditGuard implements CanActivate {
	constructor(private readonly cedarAuthService: CedarAuthorizationService) {}

	canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
		return new Promise(async (resolve, reject) => {
			const request: IRequestWithCognitoInfo = context.switchToHttp().getRequest();
			const cognitoUserName = request.decoded.sub;
			let connectionId: string = request.params?.slug || request.params?.connectionId;
			if (!connectionId || (!validateUuidByRegex(connectionId) && !ValidationHelper.isValidNanoId(connectionId))) {
				connectionId = request.query.connectionId;
			}
			if (!connectionId || (!validateUuidByRegex(connectionId) && !ValidationHelper.isValidNanoId(connectionId))) {
				reject(new BadRequestException(Messages.CONNECTION_ID_MISSING));
				return;
			}

			const panelId: string = request.params?.queryId;
			let action: CedarAction;

			if (request.method === 'DELETE') {
				action = CedarAction.PanelDelete;
			} else if (request.method === 'POST' && !panelId) {
				action = CedarAction.PanelCreate;
			} else {
				action = CedarAction.PanelEdit;
			}

			try {
				const allowed = await this.cedarAuthService.validate({
					userId: cognitoUserName,
					action,
					connectionId,
					panelId,
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
