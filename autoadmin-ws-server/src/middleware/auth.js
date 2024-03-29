import { decode } from '../utils/jwt.js';
import { CONSTANTS } from '../constants/constants.js';

export async function authByToken(req, res, next) {
  const jwtSecret = process.env.JWT_SECRET;
  let token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(403).json({
      errors: { body: [CONSTANTS.AUTHORIZATION_FAILED, CONSTANTS.NO_AUTHORIZATION_HEADER] },
    });
  }

  try {
    const connectionToken = await decode(token, jwtSecret);
    if (!connectionToken)
      throw new Error(CONSTANTS.CONNECTION_TOKEN_MISSING);
    req.connectionToken = connectionToken;
    return next();
  } catch (e) {
    return res.status(401).json({
      errors: { body: [CONSTANTS.AUTHORIZATION_FAILED, e.message] },
    });
  }

}
