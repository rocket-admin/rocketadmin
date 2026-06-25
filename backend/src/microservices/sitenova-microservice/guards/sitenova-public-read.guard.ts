import { BadRequestException, CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
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

		const publicEnabled = await this.cedarAuthService.isPublicAccessEnabled(connectionId);
		if (!publicEnabled) {
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
			throw new ForbiddenException(Messages.DONT_HAVE_PERMISSIONS);
		}
		return true;
	}
}
