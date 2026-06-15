import { BadRequestException, CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Observable } from 'rxjs';
import { IRequestWithCognitoInfo } from '../authorization/cognito-decoded.interface.js';
import { CedarAction, PUBLIC_USER_ID } from '../entities/cedar-authorization/cedar-action-map.js';
import { CedarAuthorizationService } from '../entities/cedar-authorization/cedar-authorization.service.js';
import { Messages } from '../exceptions/text/messages.js';
import { ValidationHelper } from '../helpers/validators/validation-helper.js';
import { validateUuidByRegex } from './utils/validate-uuid-by-regex.js';

@Injectable()
export class TableAddGuard implements CanActivate {
	constructor(private readonly cedarAuthService: CedarAuthorizationService) {}

	canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
		return new Promise(async (resolve, reject) => {
			const request: IRequestWithCognitoInfo = context.switchToHttp().getRequest();
			const cognitoUserName = request.decoded.sub;
			const connectionId: string | undefined = request.params?.slug || request.params?.connectionId;
			const tableName: string | undefined = request.query?.tableName;
			if (!tableName) {
				reject(new BadRequestException(Messages.TABLE_NAME_MISSING));
				return;
			}
			if (!connectionId || (!validateUuidByRegex(connectionId) && !ValidationHelper.isValidNanoId(connectionId))) {
				reject(new BadRequestException(Messages.CONNECTION_ID_MISSING));
				return;
			}

			try {
				// Public requests can never write: refuse outright when unauthenticated. The public
				// policy may only grant QueryTable + ColumnRead, so TableAdd is never permitted.
				if (!cognitoUserName) {
					const publicEnabled = await this.cedarAuthService.isPublicAccessEnabled(connectionId);
					if (!publicEnabled) {
						reject(new ForbiddenException(Messages.DONT_HAVE_PERMISSIONS));
						return;
					}
					const allowedPublic = await this.cedarAuthService.validate({
						userId: PUBLIC_USER_ID,
						action: CedarAction.TableAdd,
						connectionId,
						tableName,
						publicAccess: true,
					});
					if (allowedPublic) {
						resolve(true);
						return;
					}
					reject(new ForbiddenException(Messages.DONT_HAVE_PERMISSIONS));
					return;
				}

				const allowed = await this.cedarAuthService.validate({
					userId: cognitoUserName,
					action: CedarAction.TableAdd,
					connectionId,
					tableName,
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
