import { BadRequestException, createParamDecorator, ExecutionContext } from '@nestjs/common';
import { IRequestWithCognitoInfo } from '../authorization/index.js';
import { Messages } from '../exceptions/text/messages.js';
import { isObjectPropertyExists } from '../helpers/validators/is-object-property-exists-validator.js';

export const QueryTableName = createParamDecorator((data: unknown, ctx: ExecutionContext): string => {
  const request: IRequestWithCognitoInfo = ctx.switchToHttp().getRequest();
  const query = request.query;
  if (isObjectPropertyExists(query, 'tableName') && query['tableName'].length > 0) {
    return query['tableName'];
  }
  throw new BadRequestException(Messages.TABLE_NAME_MISSING);
});
