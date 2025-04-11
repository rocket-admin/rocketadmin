import { AgentEntity } from '../agent.entity.js';
import { ConnectionEntity } from '../../connection/connection.entity.js';

export interface IAgentRepository {

  createNewAgentForConnection(connection: ConnectionEntity): Promise<AgentEntity>;

  createNewAgentForConnectionAndReturnToken(connection: ConnectionEntity): Promise<string>;

  renewOrCreateConnectionToken(connectionId: string): Promise<string>;
}
