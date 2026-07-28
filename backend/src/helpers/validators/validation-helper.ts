import { BadRequestException, HttpException, HttpStatus } from '@nestjs/common';
import countries from 'i18n-iso-countries';
import validator from 'validator';
import { Messages } from '../../exceptions/text/messages.js';
import { isTest } from '../app/is-test.js';
import { Constants } from '../constants/constants.js';

export class ValidationHelper {
	public static isValidUrl(url: string): boolean {
		return validator.isURL(url);
	}

	public static isValidEmail(email: string): boolean {
		return validator.isEmail(email);
	}

	public static isValidUUID(uuid: string): boolean {
		return validator.isUUID(uuid);
	}

	public static isValidVerificationString(verificationString: string): boolean {
		return validator.isWhitelisted(verificationString, Constants.VERIFICATION_STRING_WHITELIST());
	}

	public static isValidPhoneNumber(phoneNumber: string): boolean {
		return validator.isMobilePhone(phoneNumber, 'any', { strictMode: false });
	}

	public static isValidRgbColor(rgbColor: string): boolean {
		return validator.isRgbColor(rgbColor);
	}

	public static isValidHexColor(hexColor: string): boolean {
		return validator.isHexColor(hexColor);
	}

	public static isValidHslColor(hslColor: string): boolean {
		return validator.isHSL(hslColor);
	}

	public static isValidJSON(jsonString: string): boolean {
		if (typeof jsonString !== 'string') {
			return false;
		}
		return validator.isJSON(jsonString);
	}

	public static isValidJWT(token: string): boolean {
		return validator.isJWT(token);
	}

	public static isValidDomain(domain: string): boolean {
		return validator.isFQDN(domain, { require_tld: true });
	}

	public static isValidCountryCode(countryCode: string): boolean {
		return countries.isValid(countryCode);
	}

	// Normalizes a satellite-provided link base for use in an email: returns the base without
	// trailing slashes when it passes the allowlist below, null otherwise (callers fall back to
	// the legacy link — a bad base must never fail the underlying operation).
	public static resolveEmailVerificationLinkBase(linkBase: string | null | undefined): string | null {
		if (!linkBase || !ValidationHelper.isValidEmailVerificationLinkBase(linkBase)) {
			return null;
		}
		return linkBase.replace(/\/+$/, '');
	}

	// A confirmation-link prefix a satellite (rocketadmin-saas) may ask the core to embed in the
	// verification email instead of the legacy `${APP_DOMAIN_ADDRESS}/external/...` link. Only
	// http(s) URLs without credentials/query/hash pointing at a known SaaS domain are accepted.
	public static isValidEmailVerificationLinkBase(linkBase: string): boolean {
		if (typeof linkBase !== 'string' || linkBase.length === 0) {
			return false;
		}
		let parsed: URL;
		try {
			parsed = new URL(linkBase);
		} catch (_e) {
			return false;
		}
		if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
			return false;
		}
		if (parsed.username || parsed.password || parsed.search || parsed.hash) {
			return false;
		}
		const allowedHostnames = new Set<string>(Constants.PRIMARY_SAAS_DOMAINS);
		try {
			allowedHostnames.add(new URL(Constants.APP_DOMAIN_ADDRESS).hostname);
		} catch (_e) {
			// APP_DOMAIN_ADDRESS may be a bare hostname — fall through to the raw value
			allowedHostnames.add(Constants.APP_DOMAIN_ADDRESS);
		}
		if (process.env.NODE_ENV !== 'production') {
			allowedHostnames.add('localhost');
			allowedHostnames.add('127.0.0.1');
		}
		return allowedHostnames.has(parsed.hostname);
	}

	public static validateOrThrowHttpExceptionEmail(email: string): boolean {
		const isEmailValid = ValidationHelper.isValidEmail(email);
		if (isEmailValid) {
			return true;
		}
		throw new BadRequestException(Messages.EMAIL_INVALID);
	}

	public static isValidNanoId(id: string): boolean {
		if (typeof id !== 'string') {
			return false;
		}
		const validChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
		if (id.length !== 8) {
			return false;
		}
		for (let i = 0; i < id.length; i++) {
			if (!validChars.includes(id[i])) {
				return false;
			}
		}
		return true;
	}

	public static isPasswordStrongOrThrowError(password: string): boolean {
		if (isTest()) {
			return true;
		}
		const result = validator.isStrongPassword(password, {
			minLength: 8,
			minLowercase: 1,
			minUppercase: 1,
			minNumbers: 1,
			minSymbols: 0,
			returnScore: false,
			pointsPerUnique: undefined,
			pointsPerRepeat: undefined,
			pointsForContainingLower: undefined,
			pointsForContainingUpper: undefined,
			pointsForContainingNumber: undefined,
			pointsForContainingSymbol: undefined,
		});
		if (!result) {
			throw new HttpException(
				{
					message: Messages.PASSWORD_WEAK,
				},
				HttpStatus.BAD_REQUEST,
			);
		}
		return result;
	}
}
