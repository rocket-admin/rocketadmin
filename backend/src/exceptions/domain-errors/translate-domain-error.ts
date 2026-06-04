import { HttpException } from '@nestjs/common';
import { MasterPasswordIncorrectException } from '../custom-exceptions/master-password-incorrect-exception.js';
import { MasterPasswordMissingException } from '../custom-exceptions/master-password-missing-exception.js';
import { MasterPasswordIncorrectError, MasterPasswordMissingError } from './master-password.errors.js';

export function translateDomainError(exception: unknown): HttpException | null {
	if (exception instanceof MasterPasswordMissingError) {
		return new MasterPasswordMissingException();
	}
	if (exception instanceof MasterPasswordIncorrectError) {
		return new MasterPasswordIncorrectException();
	}
	return null;
}
