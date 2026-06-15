import { BadRequestException, createParamDecorator, ExecutionContext } from '@nestjs/common';
import { IRequestWithCognitoInfo } from '../authorization/cognito-decoded.interface.js';
import { Messages } from '../exceptions/text/messages.js';
import { ValidationHelper } from '../helpers/validators/validation-helper.js';

/**
 * Like @UserId(), but tolerates an unauthenticated ("public") request: when no user is present it
 * returns undefined instead of throwing. Use on endpoints that may be reached by public users
 * (the guard decides whether public access is allowed); the handler then treats a missing userId
 * as a public request.
 */
export const OptionalUserId = createParamDecorator((_data: unknown, ctx: ExecutionContext): string | undefined => {
	const request: IRequestWithCognitoInfo = ctx.switchToHttp().getRequest();
	const userId = request.decoded?.sub;
	if (!userId) {
		return undefined;
	}
	if (ValidationHelper.isValidUUID(userId)) {
		return userId;
	}
	throw new BadRequestException(Messages.UUID_INVALID);
});
