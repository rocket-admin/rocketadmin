import { BadRequestException, CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Observable } from 'rxjs';
import { IRequestWithCognitoInfo } from '../authorization/cognito-decoded.interface.js';
import { CedarAction } from '../entities/cedar-authorization/cedar-action-map.js';
import { CedarAuthorizationService } from '../entities/cedar-authorization/cedar-authorization.service.js';
import { Messages } from '../exceptions/text/messages.js';
import { ValidationHelper } from '../helpers/validators/validation-helper.js';
import { validateUuidByRegex } from './utils/validate-uuid-by-regex.js';

@Injectable()
export class ConnectionDiagramGuard implements CanActivate {
	constructor(private readonly cedarAuthService: CedarAuthorizationService) {}

	canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
		return new Promise(async (resolve, reject) => {
			const request: IRequestWithCognitoInfo = context.switchToHttp().getRequest();
			const cognitoUserName = request.decoded.sub;
			let connectionId: string = request.query.connectionId;
			if (!connectionId || (!validateUuidByRegex(connectionId) && !ValidationHelper.isValidNanoId(connectionId))) {
				connectionId = request.params?.slug || request.params?.connectionId;
			}
			if (!connectionId || (!validateUuidByRegex(connectionId) && !ValidationHelper.isValidNanoId(connectionId))) {
				reject(new BadRequestException(Messages.CONNECTION_ID_MISSING));
				return;
			}

			try {
				const allowed = await this.cedarAuthService.validate({
					userId: cognitoUserName,
					action: CedarAction.ConnectionDiagram,
					connectionId,
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
