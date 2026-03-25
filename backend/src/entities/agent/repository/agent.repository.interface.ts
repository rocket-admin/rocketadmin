import { ConnectionTypeTestEnum } from '@rocketadmin/shared-code/dist/src/shared/enums/connection-types-enum.js';
import { ConnectionEntity } from '../../connection/connection.entity.js';
import { AgentEntity } from '../agent.entity.js';

export interface IAgentRepository {
	createNewAgentForConnection(connection: ConnectionEntity): Promise<AgentEntity>;

	createNewAgentForConnectionAndReturnToken(connection: ConnectionEntity): Promise<string>;

	renewOrCreateConnectionToken(connectionId: string): Promise<string>;

	getTestAgentToken(connectionType: ConnectionTypeTestEnum): string;
}
