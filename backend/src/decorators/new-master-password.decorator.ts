import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { IRequestWithCognitoInfo } from '../authorization';

export const NewMasterPassword = createParamDecorator((data: any, ctx: ExecutionContext): string => {
  const request: IRequestWithCognitoInfo = ctx.switchToHttp().getRequest();
  const masterPwd = request.headers['newmasterpwd'];
  return masterPwd ? masterPwd : null;
});
