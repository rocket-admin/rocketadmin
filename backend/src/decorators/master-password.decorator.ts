import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { IRequestWithCognitoInfo } from '../authorization';

export const MasterPassword = createParamDecorator((data: any, ctx: ExecutionContext): string => {
  const request: IRequestWithCognitoInfo = ctx.switchToHttp().getRequest();
  const masterPwd = request.headers['masterpwd'];
  return masterPwd ? masterPwd : null;
});
