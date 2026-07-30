import {
	BadRequestException,
	CanActivate,
	ExecutionContext,
	ForbiddenException,
	Injectable,
	Logger,
} from '@nestjs/common';
import { Request } from 'express';
import { CedarAction, PUBLIC_USER_ID } from '../../../entities/cedar-authorization/cedar-action-map.js';
import { CedarAuthorizationService } from '../../../entities/cedar-authorization/cedar-authorization.service.js';
import { Messages } from '../../../exceptions/text/messages.js';

// Gates read operations on the generated-site data API. Reads are allowed only when the connection
// has a public policy that grants table:query on the requested table — the same public-permissions
// mechanism the existing /table/crud routes use (see QueryTableGuard). The visitor is anonymous
// here; column visibility follows the connection's public-read policy downstream.
@Injectable()
export class SitenovaPublicReadGuard implements CanActivate {
	private readonly logger = new Logger(SitenovaPublicReadGuard.name);

	constructor(private readonly cedarAuthService: CedarAuthorizationService) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const request = context.switchToHttp().getRequest<Request>();
		const connectionId = request.params?.connectionId as string | undefined;
		const tableName = request.body?.tableName as string | undefined;
		if (!connectionId) {
			throw new BadRequestException(Messages.CONNECTION_ID_MISSING);
		}
		if (!tableName) {
			throw new BadRequestException(Messages.TABLE_NAME_MISSING);
		}

		// The deny REASON is logged on purpose: an anonymous 403 here is what a generated site's
		// visitor hits when the public grant is missing/partial, and the two causes (no public
		// policy at all vs. this specific table not granted) have different fixes.
		const publicEnabled = await this.cedarAuthService.isPublicAccessEnabled(connectionId);
		if (!publicEnabled) {
			this.logger.warn(
				`Public read DENIED (connection has NO public policy): connection=${connectionId} table=${tableName}`,
			);
			throw new ForbiddenException(Messages.DONT_HAVE_PERMISSIONS);
		}
		const allowed = await this.cedarAuthService.validate({
			userId: PUBLIC_USER_ID,
			action: CedarAction.TableQuery,
			connectionId,
			tableName,
			publicAccess: true,
		});
		if (!allowed) {
			this.logger.warn(
				`Public read DENIED (table not in the public policy): connection=${connectionId} table=${tableName}`,
			);
			throw new ForbiddenException(Messages.DONT_HAVE_PERMISSIONS);
		}
		return true;
	}
}
