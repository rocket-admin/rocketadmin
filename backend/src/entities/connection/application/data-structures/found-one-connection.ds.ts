import { ApiProperty } from '@nestjs/swagger';
import { AccessLevelEnum } from '../../../../enums/access-level.enum.js';
import { FoundConnectionPropertiesDs } from '../../../connection-properties/application/data-structures/found-connection-properties.ds.js';
import {
	FoundAgentConnectionsDs,
	FoundDirectConnectionsDs,
	FoundDirectConnectionsNonePermissionDs,
} from './found-connections.ds.js';

export class FoundOneConnectionDs {
	@ApiProperty({ type: FoundDirectConnectionsDs })
	connection: FoundDirectConnectionsDs | FoundAgentConnectionsDs | FoundDirectConnectionsNonePermissionDs;

	@ApiProperty({ enum: AccessLevelEnum })
	accessLevel: AccessLevelEnum;

	@ApiProperty()
	groupManagement: boolean;

	@ApiProperty({ type: FoundConnectionPropertiesDs })
	connectionProperties: FoundConnectionPropertiesDs;
}
