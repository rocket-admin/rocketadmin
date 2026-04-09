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
import { CedarAction } from '../entities/cedar-authorization/cedar-action-map.js';
import { CedarAuthorizationService } from '../entities/cedar-authorization/cedar-authorization.service.js';
import { Messages } from '../exceptions/text/messages.js';
import { ValidationHelper } from '../helpers/validators/validation-helper.js';
import { validateUuidByRegex } from './utils/validate-uuid-by-regex.js';

@Injectable()
export class PanelReadGuard implements CanActivate {
	constructor(
		private readonly cedarAuthService: CedarAuthorizationService,
		@Inject(BaseType.GLOBAL_DB_CONTEXT)
		private readonly _dbContext: IGlobalDatabaseContext,
	) {}

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

			try {
				// For list-all requests (no panelId), verify user belongs to the connection.
				// The use case will filter results based on per-panel permissions.
				if (!panelId) {
					const isUserInConnection = await this._dbContext.connectionRepository.isUserFromConnection(
						cognitoUserName,
						connectionId,
					);
					if (isUserInConnection) {
						resolve(true);
						return;
					}
					reject(new ForbiddenException(Messages.DONT_HAVE_PERMISSIONS));
					return;
				}

				const allowed = await this.cedarAuthService.validate({
					userId: cognitoUserName,
					action: CedarAction.PanelRead,
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
