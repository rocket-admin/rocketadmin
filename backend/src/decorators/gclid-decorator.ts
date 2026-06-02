import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { IRequestWithCognitoInfo } from '../authorization/cognito-decoded.interface.js';

export const GCLlId = createParamDecorator((_data: unknown, ctx: ExecutionContext): string | null => {
	const request: IRequestWithCognitoInfo = ctx.switchToHttp().getRequest();
	if (request.headers) {
		return (request.headers.gclid as string | undefined) ?? null;
	}
	return null;
});
