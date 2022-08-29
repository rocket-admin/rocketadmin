import { ConnectionEntity } from '../connection.entity';
import { Encryptor } from '../../../helpers/encryption/encryptor';
import { EntityRepository, getRepository, Repository } from 'typeorm';
import { IConnectionRepository } from './connection.repository.interface';
import { isConnectionTypeAgent } from '../../../helpers';
import { Constants } from '../../../helpers/constants/constants';
import { TableLogsEntity } from '../../table-logs/table-logs.entity';

@EntityRepository(ConnectionEntity)
export class ConnectionRepository extends Repository<ConnectionEntity> implements IConnectionRepository {
  constructor() {
    super();
  }

  public async saveNewConnection(connection: ConnectionEntity): Promise<ConnectionEntity> {
    const savedConnection = await this.save(connection);
    if (!isConnectionTypeAgent(savedConnection.type)) {
      savedConnection.host = this.decryptConnectionField(savedConnection.host);
      savedConnection.database = this.decryptConnectionField(savedConnection.database);
      savedConnection.password = this.decryptConnectionField(savedConnection.password);
      savedConnection.username = this.decryptConnectionField(savedConnection.username);
      if (savedConnection.ssh) {
        savedConnection.privateSSHKey = this.decryptConnectionField(savedConnection.privateSSHKey);
        savedConnection.sshHost = this.decryptConnectionField(savedConnection.sshHost);
        savedConnection.sshUsername = this.decryptConnectionField(savedConnection.sshUsername);
      }
      if (savedConnection.ssl && savedConnection.cert) {
        savedConnection.cert = this.decryptConnectionField(savedConnection.cert);
      }
    }
    return savedConnection;
  }

  public async findAllUserConnections(
    userId: string,
  ): Promise<Array<Omit<ConnectionEntity, 'password' | 'privateSSHKey' | 'groups'>>> {
    const connectionQb = await getRepository(ConnectionEntity)
      .createQueryBuilder('connection')
      .leftJoinAndSelect('connection.groups', 'group')
      .leftJoinAndSelect('group.users', 'user')
      .andWhere('user.id = :userId', { userId: userId });
    const allConnections = await connectionQb.getMany();
    return allConnections.map((connection) => {
      delete connection.password;
      delete connection.privateSSHKey;
      delete connection.groups;
      return connection;
    });
  }

  public async findOneConnection(
    connectionId: string,
  ): Promise<Omit<ConnectionEntity, 'password' | 'privateSSHKey' | 'groups'> | null> {
    const connection = await this.findOne({ id: connectionId });
    if (!connection) {
      return null;
    }
    delete connection.password;
    delete connection.privateSSHKey;
    delete connection.groups;
    return connection;
  }

  public async findFullConnectionEntity(connectionId: string): Promise<ConnectionEntity> {
    return await this.findOne({ id: connectionId });
  }

  public async findAndDecryptConnection(connectionId: string, masterPwd: string): Promise<ConnectionEntity> {
    const qb = await getRepository(ConnectionEntity)
      .createQueryBuilder('connection')
      .leftJoinAndSelect('connection.agent', 'agent')
      .andWhere('connection.id = :connectionId', { connectionId: connectionId });
    let connection = await qb.getOne();
    if (!connection) {
      return null;
    }
    if (connection.masterEncryption && masterPwd) {
      connection = Encryptor.decryptConnectionCredentials(connection, masterPwd);
    }
    return connection;
  }

  public async removeConnection(connection: ConnectionEntity): Promise<ConnectionEntity> {
    return await this.remove(connection);
  }

  public async findConnectionWithGroups(
    connectionId: string,
  ): Promise<Omit<ConnectionEntity, 'password' | 'privateSSHKey' | 'cert'>> {
    const qb = await getRepository(ConnectionEntity)
      .createQueryBuilder('connection')
      .leftJoinAndSelect('connection.groups', 'group')
      .andWhere('connection.id = :connectionId', { connectionId: connectionId });
    const connection = await qb.getOne();
    delete connection.password;
    delete connection.privateSSHKey;
    delete connection.cert;
    return connection;
  }

  public async getConnectionsWithNonNullUsersGCLIDs(): Promise<Array<ConnectionEntity>> {
    const dateTwoWeeksAgo = Constants.TWO_WEEKS_AGO();
    const connectionsQB = await getRepository(ConnectionEntity)
      .createQueryBuilder('connection')
      .where('connection.createdAt > :date', { date: dateTwoWeeksAgo })
      .leftJoinAndSelect('connection.author', 'user')
      .andWhere('user.gclid IS NOT NULL');
    const freshConnections = await connectionsQB.getMany();
    const testConnectionsHosts = Constants.getTestConnectionsArr().map((connection) => {
      return connection.host;
    });
    return freshConnections.filter((connection) => {
      return !testConnectionsHosts.includes(connection.host);
    });
  }

  public async getWorkedConnectionsInTwoWeeks(): Promise<Array<ConnectionEntity>> {
    const freshConnections = await this.getConnectionsWithNonNullUsersGCLIDs();
    const workedFreshConnections: Array<ConnectionEntity> = await Promise.all(
      freshConnections.map(async (connection: ConnectionEntity): Promise<ConnectionEntity | null> => {
        const qb = await getRepository(TableLogsEntity)
          .createQueryBuilder('tableLogs')
          .leftJoinAndSelect('tableLogs.connection_id', 'connection_id');
        qb.andWhere('tableLogs.connection_id = :connection_id', { connection_id: connection.id });
        const logs = await qb.getMany();
        if (logs && logs.length > 0) {
          return connection;
        } else {
          return null;
        }
      }),
    );
    return workedFreshConnections.filter((connection) => {
      return !!connection;
    });
  }

  public async getConnectionByGroupId(groupId: string): Promise<ConnectionEntity> {
    const qb = await getRepository(ConnectionEntity)
      .createQueryBuilder('connection')
      .leftJoinAndSelect('connection.groups', 'group');
    qb.andWhere('group.id = :id', { id: groupId });
    return await qb.getOne();
  }

  public async findOneById(connectionId: string): Promise<ConnectionEntity> {
    return await this.findOne({ id: connectionId });
  }

  public async findOneAgentConnectionByToken(connectionToken: string): Promise<ConnectionEntity> {
    const qb = await getRepository(ConnectionEntity)
      .createQueryBuilder('connection')
      .leftJoinAndSelect('connection.agent', 'agent');
    qb.andWhere('agent.token = :agentToken', { agentToken: connectionToken });
    return await qb.getOne();
  }

  private decryptConnectionField(field: string): string {
    try {
      return Encryptor.decryptData(field);
    } catch (e) {
      return field;
    }
  }
}
