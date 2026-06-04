import { HttpException, HttpStatus } from '@nestjs/common';
import { ExceptionsInternalCodes } from './custom-exceptions-internal-codes/exceptions-internal-codes.js';
import { ExceptionType } from './exception-type.js';

export interface RocketAdminExceptionOptions {
	originalMessage?: string;
	internalCode?: ExceptionsInternalCodes;
	type?: ExceptionType;
}

export class BaseRocketAdminException extends HttpException {
	public readonly originalMessage?: string;
	public readonly internalCode?: ExceptionsInternalCodes;
	public readonly type?: ExceptionType;

	constructor(message: string, status: HttpStatus | number, options: RocketAdminExceptionOptions = {}) {
		super(message, status);
		this.originalMessage = options.originalMessage;
		this.internalCode = options.internalCode;
		this.type = options.type;
	}
}
