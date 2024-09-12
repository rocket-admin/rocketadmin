import { Inject, Injectable, InternalServerErrorException } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { AccessLevelEnum, AmplitudeEventTypeEnum } from '../../../enums/index.js';
import { Constants } from '../../../helpers/constants/constants.js';
import { AmplitudeService } from '../../amplitude/amplitude.service.js';
import { CreateUserDs } from '../../user/application/data-structures/create-user.ds.js';
import { FindUserDs } from '../../user/application/data-structures/find-user.ds.js';
import { FoundConnectionsDs } from '../application/data-structures/found-connections.ds.js';
import { IFindConnections } from './use-cases.interfaces.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { ConnectionEntity } from '../connection.entity.js';
import { buildFoundConnectionDs } from '../utils/build-found-connection.ds.js';

export type RequiredConnectionKeys = Pick<ConnectionEntity, 'id' | 'database' | 'isTestConnection'>;
export type OptionalConnectionKeys = Partial<Omit<ConnectionEntity, keyof RequiredConnectionKeys>>;
export type FilteredConnection = RequiredConnectionKeys & OptionalConnectionKeys;

@Injectable()
export class FindAllConnectionsUseCase
  extends AbstractUseCase<CreateUserDs | FindUserDs, FoundConnectionsDs>
  implements IFindConnections
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
    private amplitudeService: AmplitudeService,
  ) {
    super();
  }

  protected async implementation(userData: CreateUserDs | FindUserDs): Promise<FoundConnectionsDs> {
    const user = await this._dbContext.userRepository.findOneUserById(userData.id);
    if (!user) {
      throw new InternalServerErrorException(Messages.USER_NOT_FOUND);
    }
    const allFoundUserConnections = await this._dbContext.connectionRepository.findAllUserConnections(user.id, false);

    if(user.showTestConnections) {
      const allFoundUserTestConnections = await this._dbContext.connectionRepository.findAllUserTestConnections(user.id);
      allFoundUserConnections.push(...allFoundUserTestConnections);
    }

    const filterConnectionKeys = (connection: ConnectionEntity, allowedKeys: Array<string>): FilteredConnection => {
      return Object.keys(connection).reduce((acc, key) => {
        if (allowedKeys.includes(key)) {
          // eslint-disable-next-line security/detect-object-injection
          acc[key] = connection[key];
        }
        return acc;
      }, {} as FilteredConnection);
    };

    const connectionsWithPermissions = await Promise.all(
      allFoundUserConnections.map(async (connection) => {
        const accessLevel = await this._dbContext.userAccessRepository.getUserConnectionAccessLevel(
          user.id,
          connection.id,
        );
        let filteredConnection: FilteredConnection = connection;

        if (accessLevel === AccessLevelEnum.none) {
          filteredConnection = filterConnectionKeys(connection, Constants.CONNECTION_KEYS_NONE_PERMISSION);
        } else if (accessLevel !== AccessLevelEnum.edit) {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { signing_key, ...rest } = connection;
          filteredConnection = rest;
        }

        return {
          connection: buildFoundConnectionDs(filteredConnection),
          accessLevel: accessLevel,
        };
      }),
    );

    await this.amplitudeService.formAndSendLogRecord(AmplitudeEventTypeEnum.connectionListReceived, user.id);
    return {
      connections: connectionsWithPermissions,
      connectionsCount: connectionsWithPermissions.length,
    };
  }
}
