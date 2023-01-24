import { nanoid } from 'nanoid';
import { ConnectionEntity } from '../../connection/connection.entity.js';
import { AgentEntity } from '../agent.entity.js';

export const customAgentRepositoryExtension = {
  async saveNewAgent(agent: AgentEntity): Promise<AgentEntity> {
    return await this.save(agent);
  },

  async createNewAgentForConnectionAndReturnToken(connection: ConnectionEntity): Promise<string> {
    const newAgent = await this.createNewAgentForConnection(connection);
    return newAgent.token;
  },

  async createNewAgentForConnection(connection: ConnectionEntity): Promise<AgentEntity> {
    const agent = new AgentEntity();
    const token = nanoid(64);
    if (process.env.NODE_ENV !== 'test') {
      agent.token = token;
    } else {
      agent.token = '_ueF-9gQ4Kv1YVITBn0W_Hzvr5tBBSRmhLEZv2IcejomK2LGBhaFkEzOSB3FvFDW';
    }
    agent.connection = connection;
    const savedAgent = await this.save(agent);
    savedAgent.token = token;
    return savedAgent;
  },

  async renewOrCreateConnectionToken(connectionId: string): Promise<string> {
    const agentQb = this.createQueryBuilder('agent')
      .leftJoinAndSelect('agent.connection', 'connection')
      .andWhere('connection.id = :connectionId', { connectionId: connectionId });
    const foundAgent = await agentQb.getOne();
    if (!foundAgent) {
      const connectionQb = this.manager
        .getRepository(ConnectionEntity)
        .createQueryBuilder('connection')
        .andWhere('connection.id = :connectionId', { connectionId: connectionId });
      const foundConnection = await connectionQb.getOne();
      return await this.createNewAgentForConnectionAndReturnToken(foundConnection);
    } else {
      const newToken = nanoid(64);
      foundAgent.token = newToken;
      await this.save(foundAgent);
      return newToken;
    }
  },
};
