import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import PQueue from 'p-queue';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { SimpleFoundUserInCompanyInfoDs } from '../../user/dto/found-user.dto.js';
import { buildSimpleUserInfoDs } from '../../user/utils/build-created-user.ds.js';
import { IGetUsersInCompany } from './company-info-use-cases.interface.js';

@Injectable()
export class GetAllUsersInCompanyUseCase
  extends AbstractUseCase<string, Array<SimpleFoundUserInCompanyInfoDs>>
  implements IGetUsersInCompany
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }

  protected async implementation(companyId: string): Promise<Array<SimpleFoundUserInCompanyInfoDs>> {
    const foundCompany = await this._dbContext.companyInfoRepository.findCompanyInfoWithUsersById(companyId);
    if (!foundCompany) {
      throw new HttpException(
        {
          message: Messages.COMPANY_NOT_FOUND,
        },
        HttpStatus.NOT_FOUND,
      );
    }
    const foundUsers = foundCompany.users;

    const responseObjects: Array<SimpleFoundUserInCompanyInfoDs> = [];

    const queue = new PQueue({ concurrency: 3 });
    await Promise.all(
      foundUsers.map(async (user) => {
        await queue.add(async () => {
          if (!user) {
            return;
          }
          const usersConnectionsWithGroups = await this._dbContext.connectionRepository.findAllUserNonTestsConnections(
            user.id,
          );
          const userInfo = buildSimpleUserInfoDs(user);
          const userRO: SimpleFoundUserInCompanyInfoDs = {
            ...userInfo,
            user_membership: usersConnectionsWithGroups.map((connection) => {
              return {
                id: connection.id,
                title: connection.title,
                database: connection.database,
                groups: connection.groups.map((group) => {
                  return {
                    id: group.id,
                    title: group.title,
                  };
                }),
              };
            }),
            has_groups: usersConnectionsWithGroups.length > 0,
          };
          responseObjects.push(userRO);
        });
      }),
    );
    return responseObjects;
  }
}
