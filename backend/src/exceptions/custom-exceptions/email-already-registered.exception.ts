import { HttpStatus } from '@nestjs/common';
import { ExternalRegistrationProviderEnum } from '../../entities/user/enums/external-registration-provider.enum.js';
import { Messages } from '../text/messages.js';
import { BaseRocketAdminException } from './base-rocketadmin.exception.js';
import { ExceptionsInternalCodes } from './custom-exceptions-internal-codes/exceptions-internal-codes.js';

/**
 * Self-service registration (password, Google, GitHub) of an email address that already has an
 * account in any company (plan 53). `provider` is the conflicting account's registration
 * provider (null = password account) and only picks the wording — which door the user should use.
 */
export class EmailAlreadyRegisteredException extends BaseRocketAdminException {
	constructor(provider: ExternalRegistrationProviderEnum | null) {
		super(Messages.EMAIL_ALREADY_REGISTERED(provider), HttpStatus.BAD_REQUEST, {
			internalCode: ExceptionsInternalCodes.EMAIL_ALREADY_REGISTERED,
		});
	}
}
