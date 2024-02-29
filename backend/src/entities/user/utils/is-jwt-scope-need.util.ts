import { CompanyInfoEntity } from '../../company-info/company-info.entity.js';
import { JwtScopesEnum } from '../enums/jwt-scopes.enum.js';
import { UserEntity } from '../user.entity.js';

export function isJwt2faScopeNeed(user: UserEntity, userCompany: CompanyInfoEntity): boolean {
  return userCompany?.is2faEnabled && !user.isOTPEnabled;
}

export function get2FaScope(user: UserEntity, userCompany: CompanyInfoEntity): Array<JwtScopesEnum | null> {
  return isJwt2faScopeNeed(user, userCompany) ? [JwtScopesEnum.TWO_FA_ENABLE] : null;
}
