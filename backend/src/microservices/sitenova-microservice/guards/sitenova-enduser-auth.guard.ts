import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { extractTokenFromHeader } from '../../../authorization/utils/extract-token-from-header.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { SitenovaEndUserTokenPayload } from '../data-structures/sitenova-site.ds.js';
import { SitenovaEndUserAuthService } from '../services/sitenova-enduser-auth.service.js';

export interface RequestWithSitenovaEndUser extends Request {
	sitenovaEndUser?: SitenovaEndUserTokenPayload;
}

// Gates write operations on the generated-site data API. The site visitor must present a valid
// end-user JWT (issued by login/register) bound to the connection in the route. The connected DB
// user's privileges remain the outer bound; the trusted `tableName` allow-listing is deferred.
@Injectable()
export class SitenovaEndUserAuthGuard implements CanActivate {
	constructor(private readonly endUserAuthService: SitenovaEndUserAuthService) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const request = context.switchToHttp().getRequest<RequestWithSitenovaEndUser>();
		const connectionId = request.params?.connectionId as string | undefined;
		const token = extractTokenFromHeader(request);
		if (!connectionId || !token) {
			throw new UnauthorizedException(Messages.AUTHORIZATION_REJECTED);
		}
		const decoded = await this.endUserAuthService.verifyEndUserToken(connectionId, token);
		if (!decoded) {
			throw new UnauthorizedException(Messages.AUTHORIZATION_REJECTED);
		}
		request.sitenovaEndUser = decoded;
		return true;
	}
}
