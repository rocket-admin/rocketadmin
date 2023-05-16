import * as jwt from 'jsonwebtoken';

export async function signToken(agent) {
  const JWT_SECRET = process.env.JWT_SECRET;
  return new Promise((resolve, reject) => {
    jwt.sign({
      token: agent.token,
    }, JWT_SECRET, (err, token) => {
      if (err)
        return reject(err);
      return resolve(token);
    });
  });

}

export async function decode(token) {
  const JWT_SECRET = process.env.JWT_SECRET;
  return new Promise((resolve, reject) => {
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err)
        return reject(err);

      return resolve(decoded);
    });
  });
}
