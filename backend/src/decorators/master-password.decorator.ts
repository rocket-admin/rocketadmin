import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { IRequestWithCognitoInfo } from '../authorization/index.js';

export const MasterPassword = createParamDecorator((_data: any, ctx: ExecutionContext): string => {
  const request: IRequestWithCognitoInfo = ctx.switchToHttp().getRequest();
  const masterPwd = request.headers.masterpwd as string | undefined;
  return masterPwd ? masterPwd : null;
});
