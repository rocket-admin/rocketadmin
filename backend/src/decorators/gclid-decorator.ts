import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { IRequestWithCognitoInfo } from '../authorization/index.js';

export const GCLlId = createParamDecorator((data: any, ctx: ExecutionContext): string => {
  const request: IRequestWithCognitoInfo = ctx.switchToHttp().getRequest();
  if (request.headers) {
    return request.headers['GCLID']
      ? request.headers['GCLID']
      : request.headers['gclid']
      ? request.headers['gclid']
      : null;
  }
  return null;
});
