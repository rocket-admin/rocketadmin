import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { IRequestWithCognitoInfo } from '../authorization';
import { validate as uuidValidate } from 'uuid';
import { buildBadRequestException } from '../guards/utils';
import { Messages } from '../exceptions/text/messages';

export const ConnectionId = createParamDecorator((data: any, ctx: ExecutionContext): string => {
  const request: IRequestWithCognitoInfo = ctx.switchToHttp().getRequest();
  const connectionId: string = request.params?.slug;
  const validationResult = uuidValidate(connectionId);
  if (validationResult) {
    return connectionId;
  }
  throw buildBadRequestException(Messages.UUID_INVALID);
});
