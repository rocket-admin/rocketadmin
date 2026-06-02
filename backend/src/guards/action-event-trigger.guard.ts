import {
	BadRequestException,
	CanActivate,
	ExecutionContext,
	ForbiddenException,
	Inject,
	Injectable,
} from '@nestjs/common';
import { IRequestWithCognitoInfo } from '../authorization/cognito-decoded.interface.js';
import { IGlobalDatabaseContext } from '../common/application/global-database-context.interface.js';
import { BaseType } from '../common/data-injection.tokens.js';
import { CedarAction } from '../entities/cedar-authorization/cedar-action-map.js';
import { CedarAuthorizationService } from '../entities/cedar-authorization/cedar-authorization.service.js';
import { Messages } from '../exceptions/text/messages.js';
import { ValidationHelper } from '../helpers/validators/validation-helper.js';
import { validateUuidByRegex } from './utils/validate-uuid-by-regex.js';

@Injectable()
export class ActionEventTriggerGuard implements CanActivate {
	constructor(
		private readonly cedarAuthService: CedarAuthorizationService,
		@Inject(BaseType.GLOBAL_DB_CONTEXT)
		private readonly globalDbContext: IGlobalDatabaseContext,
	) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const request: IRequestWithCognitoInfo = context.switchToHttp().getRequest();
		const cognitoUserName = request.decoded.sub;
		if (!cognitoUserName) {
			throw new ForbiddenException(Messages.DONT_HAVE_PERMISSIONS);
		}
		const connectionId: string | undefined = request.params?.connectionId;
		const eventId: string | undefined = request.params?.eventId;

		if (!connectionId || (!validateUuidByRegex(connectionId) && !ValidationHelper.isValidNanoId(connectionId))) {
			throw new BadRequestException(Messages.CONNECTION_ID_MISSING);
		}
		if (!eventId || !validateUuidByRegex(eventId)) {
			throw new ForbiddenException(Messages.DONT_HAVE_PERMISSIONS);
		}

		const actionEvent = await this.globalDbContext.actionEventsRepository.findEventByIdInConnection(
			eventId,
			connectionId,
		);
		if (!actionEvent || !actionEvent.action_rule?.table_name) {
			throw new ForbiddenException(Messages.DONT_HAVE_PERMISSIONS);
		}

		const allowed = await this.cedarAuthService.validate({
			userId: cognitoUserName,
			action: CedarAction.ActionEventTrigger,
			connectionId,
			tableName: actionEvent.action_rule.table_name,
			actionEventId: eventId,
		});
		if (!allowed) {
			throw new ForbiddenException(Messages.DONT_HAVE_PERMISSIONS);
		}
		return true;
	}
}
