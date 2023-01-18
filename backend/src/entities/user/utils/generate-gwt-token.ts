import jwt from 'jsonwebtoken';
import { UserEntity } from '../user.entity.js';

export function generateGwtToken(user: UserEntity): IToken {
  const today = new Date();
  const exp = new Date(today);
  exp.setTime(today.getTime() + 60 * 60 * 1000 * 24 * 7);
  const jwtSecret = process.env.JWT_SECRET;
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
  };
}

export interface IToken {
  exp: Date;
  token: string;
}

export interface ITokenExp {
  expires: Date;
}
