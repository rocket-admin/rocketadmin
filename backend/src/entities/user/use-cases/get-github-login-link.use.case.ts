import { Injectable, Inject } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { IGetGitHubLoginLink } from './user-use-cases.interfaces.js';
import queryString from 'query-string';
import { Constants } from '../../../helpers/constants/constants.js';
import { getRequiredEnvVariable } from '../../../helpers/app/get-requeired-env-variable.js';

@Injectable()
export class GetGitHubLoginLinkUseCase extends AbstractUseCase<undefined, string> implements IGetGitHubLoginLink {
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }

  protected async implementation(): Promise<string> {
    const params = queryString.stringify({
      client_id: getRequiredEnvVariable('GIT_HUB_CLIENT_ID'),
      redirect_uri: `${Constants.APP_DOMAIN_ADDRESS}/api/user/authenticate/github`,
      scope: ['read:user', 'user:email'].join(' '),
      allow_signup: true,
    });

    return `https://github.com/login/oauth/authorize?${params}`;
  }
}
