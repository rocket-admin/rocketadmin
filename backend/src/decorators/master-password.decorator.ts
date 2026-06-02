import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { IRequestWithCognitoInfo } from '../authorization/cognito-decoded.interface.js';

export const MasterPassword = createParamDecorator((_data: unknown, ctx: ExecutionContext): string | null => {
	const request: IRequestWithCognitoInfo = ctx.switchToHttp().getRequest();
	const masterPwd = request.headers.masterpwd as string | undefined;
	return masterPwd ? masterPwd : null;
});
