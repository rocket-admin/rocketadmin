import { Messages } from '../text/messages.js';

export class MasterPasswordMissingError extends Error {
	constructor() {
		super(Messages.MASTER_PASSWORD_MISSING);
		this.name = 'MasterPasswordMissingError';
	}
}

export class MasterPasswordIncorrectError extends Error {
	constructor() {
		super(Messages.MASTER_PASSWORD_INCORRECT);
		this.name = 'MasterPasswordIncorrectError';
	}
}
