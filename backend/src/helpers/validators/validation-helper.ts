import { BadRequestException, HttpException, HttpStatus } from '@nestjs/common';
import validator from 'validator';
import { Messages } from '../../exceptions/text/messages.js';
import { Constants } from '../constants/constants.js';
import countries from 'i18n-iso-countries';

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
    validator.isJSON(jsonString);
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
      if (!validChars.includes(id.at(i))) {
        return false;
      }
    }
    return true;
  }

  public static isPasswordStrongOrThrowError(password: string): boolean {
    if (process.env.NODE_ENV === 'test') {
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
