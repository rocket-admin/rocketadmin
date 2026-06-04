import {
	BadRequestException,
	CanActivate,
	ExecutionContext,
	HttpStatus,
	Inject,
	Injectable,
	UnauthorizedException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { IRequestWithCognitoInfo } from '../authorization/cognito-decoded.interface.js';
import { IGlobalDatabaseContext } from '../common/application/global-database-context.interface.js';
import { BaseType } from '../common/data-injection.tokens.js';
import { ConnectionNotFoundException } from '../exceptions/custom-exceptions/connection-not-found-exception.js';
import { Messages } from '../exceptions/text/messages.js';
import { ValidationHelper } from '../helpers/validators/validation-helper.js';
import { validateUuidByRegex } from './utils/validate-uuid-by-regex.js';

@Injectable()
export class TablesReceiveGuard implements CanActivate {
	constructor(
		@Inject(BaseType.GLOBAL_DB_CONTEXT)
		protected _dbContext: IGlobalDatabaseContext,
	) {}

	canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
		return new Promise(async (resolve, reject) => {
			const request: IRequestWithCognitoInfo = context.switchToHttp().getRequest();
			const cognitoUserName = request.decoded.sub;
			if (!cognitoUserName) {
				reject(new UnauthorizedException(Messages.DONT_HAVE_PERMISSIONS));
				return;
			}
			const connectionId: string | undefined = request.params?.slug || request.params?.connectionId;
			if (!connectionId || (!validateUuidByRegex(connectionId) && !ValidationHelper.isValidNanoId(connectionId))) {
				reject(new BadRequestException(Messages.CONNECTION_ID_MISSING));
				return;
			}
			let canUserReadTables = false;
			try {
				canUserReadTables = await this._dbContext.connectionRepository.isUserFromConnection(
					cognitoUserName,
					connectionId,
				);
			} catch (error) {
				reject(error);
				return;
			}

			if (canUserReadTables) {
				resolve(canUserReadTables);
				return;
			} else {
				reject(new ConnectionNotFoundException(HttpStatus.BAD_REQUEST));
			}
		});
	}
}
