import { nanoid } from 'nanoid';
import { ConnectionEntity } from '../../connection/connection.entity.js';
import { AgentEntity } from '../agent.entity.js';
import { ConnectionTypeTestEnum } from '../../../enums/connection-type.enum.js';

export const customAgentRepositoryExtension = {
  async createNewAgentForConnectionAndReturnToken(connection: ConnectionEntity): Promise<string> {
    const newAgent = await this.createNewAgentForConnection(connection);
    return newAgent.token;
  },

  async createNewAgentForConnection(connection: ConnectionEntity): Promise<AgentEntity> {
    const agent = new AgentEntity();
    let token = nanoid(64);
    if (process.env.NODE_ENV !== 'test') {
      agent.token = token;
    } else {
      token = this.getTestAgentToken(connection.type);
      agent.token = token;
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

  getTestAgentToken(connectionType: ConnectionTypeTestEnum): string {
    if (process.env.NODE_ENV !== 'test') throw new Error('Test agent token can only be used in test environment');
    switch (connectionType) {
      case ConnectionTypeTestEnum.agent_oracledb:
        return 'ORACLE-TEST-AGENT-TOKEN';
      case ConnectionTypeTestEnum.agent_mssql:
        return 'MSSQL-TEST-AGENT-TOKEN';
      case ConnectionTypeTestEnum.agent_mysql:
        return 'MYSQL-TEST-AGENT-TOKEN';
      case ConnectionTypeTestEnum.agent_postgres:
        return 'POSTGRES-TEST-AGENT-TOKEN';
      case ConnectionTypeTestEnum.cli_mssql:
        return 'MSSQL-TEST-CLI-TOKEN';
      case ConnectionTypeTestEnum.cli_mysql:
        return 'MYSQL-TEST-CLI-TOKEN';
      case ConnectionTypeTestEnum.cli_oracledb:
        return 'ORACLE-TEST-CLI-TOKEN';
      case ConnectionTypeTestEnum.cli_postgres:
        return 'POSTGRES-TEST-CLI-TOKEN';
      case ConnectionTypeTestEnum.agent_ibmdb2:
        return 'IBMDB2-TEST-AGENT-TOKEN';
      case ConnectionTypeTestEnum.cli_ibmdb2:
        return 'IBMDB2-TEST-CLI-TOKEN';
      case ConnectionTypeTestEnum.agent_mongodb:
        return 'MONGODB-TEST-AGENT-TOKEN';
      case ConnectionTypeTestEnum.cli_mongodb:
        return 'MONGODB-TEST-CLI-TOKEN';
    }
  },
};
