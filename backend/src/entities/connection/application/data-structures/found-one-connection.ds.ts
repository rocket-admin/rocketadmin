import { AccessLevelEnum } from '../../../../enums';
import {
  FoundAgentConnectionsDs,
  FoundDirectConnectionsDs,
  FoundDirectConnectionsNonePermissionDs,
} from './found-connections.ds';

export class FoundOneConnectionDs {
  connection: FoundDirectConnectionsDs | FoundAgentConnectionsDs | FoundDirectConnectionsNonePermissionDs;
  accessLevel: AccessLevelEnum;
  groupManagement: boolean;
}
