import {
	BadRequestException,
	CanActivate,
	ExecutionContext,
	ForbiddenException,
	Inject,
	Injectable,
	Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { IRequestWithCognitoInfo } from '../authorization/index.js';
import { IGlobalDatabaseContext } from '../common/application/global-database-context.interface.js';
import { BaseType } from '../common/data-injection.tokens.js';
import { CedarAuthorizationService } from '../entities/cedar-authorization/cedar-authorization.service.js';
import { Messages } from '../exceptions/text/messages.js';
import { getMasterPwd } from '../helpers/index.js';
import { ValidationHelper } from '../helpers/validators/validation-helper.js';
import { validateUuidByRegex } from './utils/validate-uuid-by-regex.js';

@Injectable()
export class TableDeleteGuard implements CanActivate {
	private readonly logger = new Logger(TableDeleteGuard.name);

	constructor(
		@Inject(BaseType.GLOBAL_DB_CONTEXT)
		protected _dbContext: IGlobalDatabaseContext,
		private readonly cedarAuthService: CedarAuthorizationService,
	) {}

	canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
		return new Promise(async (resolve, reject) => {
			const request: IRequestWithCognitoInfo = context.switchToHttp().getRequest();
			const cognitoUserName = request.decoded.sub;
			const connectionId: string = request.params?.slug || request.params?.connectionId;
			const tableName: string = request.query?.tableName;
			const masterPwd = getMasterPwd(request);
			if (!tableName) {
				reject(new BadRequestException(Messages.TABLE_NAME_MISSING));
				return;
			}
			if (!connectionId || (!validateUuidByRegex(connectionId) && !ValidationHelper.isValidNanoId(connectionId))) {
				reject(new BadRequestException(Messages.CONNECTION_ID_MISSING));
				return;
			}

			// Cedar-first authorization
			if (this.cedarAuthService.isFeatureEnabled()) {
				try {
					const allowed = await this.cedarAuthService.checkTableDelete(cognitoUserName, connectionId, tableName);
					if (allowed) {
						resolve(true);
						return;
					}
					reject(new ForbiddenException(Messages.DONT_HAVE_PERMISSIONS));
					return;
				} catch (e) {
					if (e instanceof ForbiddenException || e?.status === 403) {
						reject(e);
						return;
					}
					this.logger.error(`Cedar authorization error, falling back to legacy: ${e.message}`);
				}
			}

			// Legacy authorization fallback
			let userTableDelete = false;
			try {
				userTableDelete = await this._dbContext.userAccessRepository.checkTableDelete(
					cognitoUserName,
					connectionId,
					tableName,
					masterPwd,
				);
			} catch (e) {
				reject(e);
				return;
			}
			if (userTableDelete) {
				resolve(userTableDelete);
			} else {
				reject(new ForbiddenException(Messages.DONT_HAVE_PERMISSIONS));
				return;
			}
		});
	}
}
