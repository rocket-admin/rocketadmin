import { FoundConnectionPropertiesDs } from 'src/entities/connection-properties/application/data-structures/found-connection-properties.ds.js';
import { AccessLevelEnum } from '../../../../enums/index.js';
import {
  FoundAgentConnectionsDs,
  FoundDirectConnectionsDs,
  FoundDirectConnectionsNonePermissionDs,
} from './found-connections.ds.js';

export class FoundOneConnectionDs {
  connection: FoundDirectConnectionsDs | FoundAgentConnectionsDs | FoundDirectConnectionsNonePermissionDs;
  accessLevel: AccessLevelEnum;
  groupManagement: boolean;
  connectionProperties: FoundConnectionPropertiesDs;
}
