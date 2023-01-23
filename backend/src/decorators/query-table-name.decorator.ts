import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { IRequestWithCognitoInfo } from '../authorization/index.js';
import { Messages } from '../exceptions/text/messages.js';
import { buildBadRequestException } from '../guards/utils/index.js';

export const QueryTableName = createParamDecorator((data: unknown, ctx: ExecutionContext): string => {
  const request: IRequestWithCognitoInfo = ctx.switchToHttp().getRequest();
  const query = request.query;
  if (query.hasOwnProperty('tableName') && query['tableName'].length > 0) {
    return query['tableName'];
  }
  throw buildBadRequestException(Messages.TABLE_NAME_MISSING);
});
