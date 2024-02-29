import jwt from 'jsonwebtoken';
import { UserEntity } from '../user.entity.js';
import { ApiProperty } from '@nestjs/swagger';
import { JwtScopesEnum } from '../enums/jwt-scopes.enum.js';

export function generateGwtToken(user: UserEntity, scope: Array<JwtScopesEnum>): IToken {
  const today = new Date();
  const exp = new Date(today);
  exp.setTime(today.getTime() + 60 * 60 * 1000 * 24 * 7);
  const jwtSecret = process.env.JWT_SECRET;
  const token = jwt.sign(
    {
      id: user.id,
      email: user.email,
      exp: Math.floor(exp.getTime() / 1000),
      scope: scope ? scope : undefined,
    },
    jwtSecret,
  );
  return {
    exp: exp,
    token: token,
    isTemporary: false,
  };
}

export function generateTemporaryJwtToken(user: UserEntity): IToken {
  const today = new Date();
  const exp = new Date(today);
  exp.setTime(today.getTime() + 1000 * 60 * 4);
  const jwtSecret = process.env.TEMPORARY_JWT_SECRET;
  const token = jwt.sign(
    {
      id: user.id,
      email: user.email,
      exp: Math.floor(exp.getTime() / 1000),
    },
    jwtSecret,
  );
  return {
    exp: exp,
    token: token,
    isTemporary: true,
  };
}

export interface IToken {
  exp: Date;
  token: string;
  isTemporary: boolean;
}

export interface ITokenExp {
  expires: Date;
  isTemporary: boolean;
}

export class TokenExpDs {
  @ApiProperty({ type: Date })
  expires: Date;

  @ApiProperty()
  isTemporary: boolean;
}
