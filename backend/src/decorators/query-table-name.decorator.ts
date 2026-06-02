import { BadRequestException, createParamDecorator, ExecutionContext } from '@nestjs/common';
import { IRequestWithCognitoInfo } from '../authorization/cognito-decoded.interface.js';
import { Messages } from '../exceptions/text/messages.js';
import { isObjectPropertyExists } from '../helpers/validators/is-object-property-exists-validator.js';

export const QueryTableName = createParamDecorator((_data: unknown, ctx: ExecutionContext): string => {
	const request: IRequestWithCognitoInfo = ctx.switchToHttp().getRequest();
	const query = request.query;
	const tableName = query.tableName;
	if (isObjectPropertyExists(query, 'tableName') && typeof tableName === 'string' && tableName.length > 0) {
		return tableName;
	}
	throw new BadRequestException(Messages.TABLE_NAME_MISSING);
});
