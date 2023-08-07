import { Injectable, Inject, HttpException, HttpStatus } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { UserEntity } from '../../../entities/user/user.entity.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { IGetUserGithubIdInfo } from './saas-use-cases.interface.js';

@Injectable()
export class GetUserInfoByGitHubIdUseCase extends AbstractUseCase<number, UserEntity> implements IGetUserGithubIdInfo {
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }

  protected async implementation(githubId: number): Promise<UserEntity> {
    const foundUser = await this._dbContext.userRepository.findOneUserByGitHubId(githubId);
    if (!foundUser) {
      throw new HttpException(
        {
          message: Messages.USER_NOT_FOUND,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    return foundUser;
  }
}
