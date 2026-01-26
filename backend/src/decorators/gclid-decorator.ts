import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { IRequestWithCognitoInfo } from '../authorization/index.js';

export const GCLlId = createParamDecorator((_data: any, ctx: ExecutionContext): string => {
  const request: IRequestWithCognitoInfo = ctx.switchToHttp().getRequest();
  if (request.headers) {
    return request.headers.gclid as string | undefined ?? null;
  }
  return null;
});
