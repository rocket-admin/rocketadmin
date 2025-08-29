import { Messages } from '../../../exceptions/text/messages.js';
import { Constants } from '../../../helpers/constants/constants.js';
import { Encryptor } from '../../../helpers/encryption/encryptor.js';
import { isConnectionTypeAgent } from '../../../helpers/index.js';
import { TableLogsEntity } from '../../table-logs/table-logs.entity.js';
import { UserEntity } from '../../user/user.entity.js';
import { ConnectionEntity } from '../connection.entity.js';
import { isTestConnectionUtil } from '../utils/is-test-connection-util.js';
import { IConnectionRepository } from './connection.repository.interface.js';

export const customConnectionRepositoryExtension: IConnectionRepository = {
  async saveNewConnection(connection: ConnectionEntity): Promise<ConnectionEntity> {
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
  },

  async findAllUserConnections(userId: string, includeTestConnections: boolean): Promise<Array<ConnectionEntity>> {
    const connectionQb = this.createQueryBuilder('connection')
      .leftJoinAndSelect('connection.groups', 'group')
      .leftJoinAndSelect('group.users', 'user')
      .leftJoinAndSelect('connection.connection_properties', 'connection_properties')
      .andWhere('user.id = :userId', { userId: userId });
    if (!includeTestConnections) {
      connectionQb.andWhere('connection.isTestConnection = :isTest', { isTest: false });
    }
    return await connectionQb.getMany();
  },

  async findAllUserTestConnections(userId: string): Promise<Array<ConnectionEntity>> {
    const connectionQb = this.createQueryBuilder('connection')
      .leftJoinAndSelect('connection.groups', 'group')
      .leftJoinAndSelect('group.users', 'user')
      .leftJoinAndSelect('connection.connection_properties', 'connection_properties')
      .andWhere('user.id = :userId', { userId: userId })
      .andWhere('connection.isTestConnection = :isTest', { isTest: true });
    return await connectionQb.getMany();
  },

  async findAllUserNonTestsConnections(userId: string): Promise<Array<ConnectionEntity>> {
    const connectionQb = this.createQueryBuilder('connection')
      .leftJoinAndSelect('connection.groups', 'group')
      .leftJoinAndSelect('group.users', 'user')
      .andWhere('user.id = :userId', { userId: userId })
      .andWhere('connection.isTestConnection = :isTest', { isTest: false });
    return await connectionQb.getMany();
  },

  async findAllUsersInConnection(connectionId: string): Promise<Array<UserEntity>> {
    const usersQb = this.manager
      .getRepository(UserEntity)
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.groups', 'group')
      .leftJoinAndSelect('group.connection', 'connection')
      .andWhere('connection.id = :connectionId', {
        connectionId: connectionId,
      });
    return await usersQb.getMany();
  },

  async findOneConnection(connectionId: string): Promise<ConnectionEntity> {
    const connectionQb = this.createQueryBuilder('connection')
      .leftJoinAndSelect('connection.connection_properties', 'connection_properties')
      .where('connection.id = :connectionId', {
        connectionId: connectionId,
      });
    const connection = await connectionQb.getOne();
    if (!connection) {
      return null;
    }
    if (!connection.signing_key) {
      connection.signing_key = Encryptor.generateRandomString(40);
      await this.save(connection);
    }
    return connection;
  },

  async findAndDecryptConnection(connectionId: string, masterPwd: string): Promise<ConnectionEntity> {
    const qb = this.createQueryBuilder('connection')
      .leftJoinAndSelect('connection.agent', 'agent')
      .andWhere('connection.id = :connectionId', { connectionId: connectionId });
    let connection = await qb.getOne();
    if (!connection) {
      return null;
    }
    if (!connection.signing_key) {
      connection.signing_key = Encryptor.generateRandomString(40);
      await this.save(connection);
    }

    if (connection.masterEncryption && !masterPwd) {
      throw new Error(Messages.MASTER_PASSWORD_MISSING);
    }

    if (connection.masterEncryption && masterPwd) {
      if (connection.master_hash) {
        const isMasterPwdCorrect = await Encryptor.verifyUserPassword(masterPwd, connection.master_hash);
        if (!isMasterPwdCorrect) {
          throw new Error(Messages.MASTER_PASSWORD_INCORRECT);
        }
      }
      connection = Encryptor.decryptConnectionCredentials(connection, masterPwd);
    }
    return connection;
  },

  async removeConnection(connection: ConnectionEntity): Promise<ConnectionEntity> {
    return await this.remove(connection);
  },

  async findConnectionWithGroups(connectionId: string): Promise<ConnectionEntity> {
    const qb = this.createQueryBuilder('connection')
      .leftJoinAndSelect('connection.groups', 'group')
      .andWhere('connection.id = :connectionId', { connectionId: connectionId });
    return await qb.getOne();
  },

  async getConnectionsWithNonNullUsersGCLIDs(): Promise<Array<ConnectionEntity>> {
    const dateTwoWeeksAgo = Constants.TWO_WEEKS_AGO();
    const connectionsQB = this.createQueryBuilder('connection')
      .where('connection.createdAt > :date', { date: dateTwoWeeksAgo })
      .leftJoinAndSelect('connection.author', 'user')
      .andWhere('user.gclid IS NOT NULL');
    const freshConnections: Array<ConnectionEntity> = await connectionsQB.getMany();
    const testConnectionsHosts = Constants.getTestConnectionsArr().map((connection) => {
      return connection.host;
    });
    return freshConnections.filter((connection: ConnectionEntity) => {
      return !testConnectionsHosts.includes(connection.host);
    });
  },

  async getWorkedConnectionsInTwoWeeks(): Promise<Array<ConnectionEntity>> {
    const freshConnections = await this.getConnectionsWithNonNullUsersGCLIDs();
    const workedFreshConnections: Array<ConnectionEntity> = await Promise.all(
      freshConnections.map(async (connection: ConnectionEntity): Promise<ConnectionEntity | null> => {
        const qb = this.manager
          .getRepository(TableLogsEntity)
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
  },

  async getConnectionByGroupIdWithCompanyAndUsersInCompany(groupId: string): Promise<ConnectionEntity> {
    const qb = this.createQueryBuilder('connection')
      .leftJoinAndSelect('connection.groups', 'group')
      .leftJoinAndSelect('connection.company', 'company')
      .leftJoinAndSelect('company.users', 'user');
    qb.andWhere('group.id = :groupId', { groupId: groupId });
    return await qb.getOne();
  },

  async getConnectionAuthorIdByGroupInConnectionId(groupId: string): Promise<string> {
    const connectionQb = this.createQueryBuilder('connection')
      .leftJoinAndSelect('connection.groups', 'group')
      .leftJoinAndSelect('connection.author', 'author')
      .andWhere('group.id = :id', { id: groupId });
    const connection: ConnectionEntity = await connectionQb.getOne();
    return connection.author.id;
  },

  async findOneById(connectionId: string): Promise<ConnectionEntity> {
    return await this.findOne({ where: { id: connectionId } });
  },

  async findOneAgentConnectionByToken(connectionToken: string): Promise<ConnectionEntity> {
    const qb = this.createQueryBuilder('connection').leftJoinAndSelect('connection.agent', 'agent');
    qb.andWhere('agent.token = :agentToken', { agentToken: connectionToken });
    return await qb.getOne();
  },

  async isTestConnectionById(connectionId: string): Promise<boolean> {
    const qb = this.createQueryBuilder('connection').where('connection.id = :connectionId', {
      connectionId: connectionId,
    });
    const foundConnection = await qb.getOne();
    return isTestConnectionUtil(foundConnection);
  },

  async saveUpdatedConnection(connection: ConnectionEntity): Promise<ConnectionEntity> {
    return this.save(connection);
  },

  async isUserFromConnection(userId: string, connectionId: string): Promise<boolean> {
    const qb = this.createQueryBuilder('connection')
      .leftJoin('connection.groups', 'group')
      .leftJoin('group.users', 'user')
      .andWhere('user.id = :userId', { userId: userId })
      .andWhere('connection.id = :connectionId', { connectionId: connectionId });
    const foundConnection = await qb.getOne();
    return !!foundConnection;
  },

  async findAllCompanyUsersNonTestsConnections(companyId: string): Promise<Array<ConnectionEntity>> {
    const connectionQb = this.createQueryBuilder('connection')
      .leftJoin('connection.groups', 'group')
      .leftJoin('group.users', 'user')
      .leftJoin('user.company', 'company')
      .leftJoinAndSelect('connection.connection_properties', 'connection_properties')
      .where('connection.isTestConnection = :isTest', { isTest: false })
      .andWhere('company.id = :companyId', { companyId: companyId });
    return await connectionQb.getMany();
  },

  async freezeConnections(connectionsIds: Array<string>): Promise<void> {
    await this.createQueryBuilder()
      .update(ConnectionEntity)
      .set({ is_frozen: true })
      .where('id IN (:...connectionsIds)', { connectionsIds })
      .execute();
  },

  async unFreezeConnections(connectionsIds: Array<string>): Promise<void> {
    await this.createQueryBuilder()
      .update(ConnectionEntity)
      .set({ is_frozen: false })
      .where('id IN (:...connectionsIds)', { connectionsIds })
      .execute();
  },

  decryptConnectionField(field: string): string {
    try {
      return Encryptor.decryptData(field);
    } catch (_e) {
      return field;
    }
  },
};
