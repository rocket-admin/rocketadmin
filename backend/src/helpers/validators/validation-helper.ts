import { HttpException, HttpStatus } from '@nestjs/common';
import validator from 'validator';
import { Messages } from '../../exceptions/text/messages';
import { buildBadRequestException } from '../../guards/utils';
import { Constants } from '../constants/constants';

export class ValidationHelper {
  public static isValidEmail(email: string): boolean {
    return validator.isEmail(email);
  }

  public static isValidUUID(uuid: string): boolean {
    return validator.isUUID(uuid);
  }

  public static isValidVerificationString(verificationString: string): boolean {
    return validator.isWhitelisted(verificationString, Constants.VERIFICATION_STRING_WHITELIST());
  }

  public static isValidJWT(token: string): boolean {
    return validator.isJWT(token);
  }

  public static validateOrThrowHttpExceptionEmail(email: string): boolean {
    const isEmailValid = ValidationHelper.isValidEmail(email);
    if (isEmailValid) {
      return true;
    }
    throw buildBadRequestException(Messages.EMAIL_INVALID);
  }

  public static validateOrThrowHttpExceptionUUID(uuid: string): boolean {
    const isValidUUID = ValidationHelper.isValidUUID(uuid);
    if (isValidUUID) {
      return true;
    }
    throw buildBadRequestException(Messages.UUID_INVALID);
  }

  public static validateOrThrowHttpExceptionVerificationString(verificationString: string): boolean {
    const isVerificationStringValid = ValidationHelper.isValidVerificationString(verificationString);
    if (isVerificationStringValid) {
      return true;
    }
    throw buildBadRequestException(Messages.VERIFICATION_STRING_INCORRECT);
  }

  public static validateOrThrowHttpExceptionJWT(token: string): boolean {
    const isJWTValid = ValidationHelper.isValidJWT(token);
    if (isJWTValid) {
      return true;
    }
    throw buildBadRequestException(Messages.INVALID_JWT_TOKEN);
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
