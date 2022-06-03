import { AgentEntity } from '../agent.entity';
import { ConnectionEntity } from '../../connection/connection.entity';

export interface IAgentRepository {
  saveNewAgent(agent: AgentEntity): Promise<AgentEntity>;

  createNewAgentForConnection(connection: ConnectionEntity): Promise<AgentEntity>;

  createNewAgentForConnectionAndReturnToken(connection: ConnectionEntity): Promise<string>;

  renewOrCreateConnectionToken(connectionId: string): Promise<string>;
}
