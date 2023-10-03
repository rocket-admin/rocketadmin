import { Injectable, CanActivate, Inject, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { IGlobalDatabaseContext } from '../common/application/global-database-context.interface.js';
import { BaseType } from '../common/data-injection.tokens.js';
import { IRequestWithCognitoInfo } from '../authorization/cognito-decoded.interface.js';
import { Observable } from 'rxjs';
import { validateUuidByRegex } from './utils/validate-uuid-by-regex.js';
import { UserEntity } from '../entities/user/user.entity.js';
import { UserRoleEnum } from '../entities/user/enums/user-role.enum.js';

@Injectable()
export class CompanyAdminGuard implements CanActivate {
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {}

  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    return new Promise(async (resolve, reject) => {
      const request: IRequestWithCognitoInfo = context.switchToHttp().getRequest();
      const userId: string = request.decoded.sub;
      let companyId: string = request.params?.slug;
      if (!companyId || !validateUuidByRegex(companyId)) {
        companyId = request.body['companyId'];
      }
      if (!companyId || !validateUuidByRegex(companyId)) {
        reject(
          new HttpException(
            {
              message: 'Company id is missing',
            },
            HttpStatus.BAD_REQUEST,
          ),
        );
        return;
      }
      let foundUser: UserEntity;
      try {
        foundUser = await this._dbContext.userRepository.findOneUserByIdAndCompanyId(userId, companyId);
        resolve(foundUser?.role === UserRoleEnum.ADMIN);
        return;
      } catch (e) {
        reject(e);
        return;
      }
    });
  }
}
