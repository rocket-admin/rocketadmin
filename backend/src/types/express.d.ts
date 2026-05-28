import type { ICognitoDecodedData } from '../authorization/cognito-decoded.interface.js';

declare module 'express' {
	interface Request {
		decoded?: Partial<ICognitoDecodedData>;
	}
}
