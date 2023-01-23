import { IRequestWithCognitoInfo } from '../authorization/index.js';

export function getMasterPwd(request: IRequestWithCognitoInfo): string | null {
  const masterPwd = request.headers['masterpwd'];
  return masterPwd ? masterPwd : null;
}

export function getNewMasterPwd(request: IRequestWithCognitoInfo): string | null {
  const masterPwd = request.headers['newmasterpwd'];
  return masterPwd ? masterPwd : null;
}
