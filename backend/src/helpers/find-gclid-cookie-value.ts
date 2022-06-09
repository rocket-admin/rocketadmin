import { IRequestWithCognitoInfo } from '../authorization';

export function findGclidCookieValue(request: IRequestWithCognitoInfo): string | null {
  if (request.headers) {
    return request.headers['GCLID']
      ? request.headers['GCLID']
      : request.headers['gclid']
      ? request.headers['gclid']
      : null;
  }
  return null;
}
