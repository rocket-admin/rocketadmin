import * as dns from 'dns';
import * as ipRangeCheck from 'ip-range-check';
import { AgentService } from '../agent/agent.service';
import { ConnectionEntity } from './connection.entity';
import { Constants } from '../../helpers/constants/constants';
import { CreateConnectionDto } from './dto';
import { getRepository, Repository } from 'typeorm';
import { Encryptor } from '../../helpers/encryption/encryptor';
import { HttpStatus, Injectable } from '@nestjs/common';
import { GroupEntity } from '../group/group.entity';
import { HttpException } from '@nestjs/common/exceptions/http.exception';
import { InjectRepository } from '@nestjs/typeorm';
import { Messages } from '../../exceptions/text/messages';
import { TableSettingsEntity } from '../table-settings/table-settings.entity';
import { UserEntity } from '../user/user.entity';
import { IConnectionRO } from './connection.interface';
import { isConnectionEntityAgent, isConnectionTypeAgent } from '../../helpers';

@Injectable()
export class ConnectionService {
  constructor(
    @InjectRepository(ConnectionEntity)
    private readonly connectionRepository: Repository<ConnectionEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(GroupEntity)
    private readonly groupRepository: Repository<GroupEntity>,
    private readonly agentService: AgentService,
    @InjectRepository(TableSettingsEntity)
    private readonly tableSettingRepository: Repository<TableSettingsEntity>,
  ) {}

  async isTestConnection(connectionId: string): Promise<boolean> {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!connectionId || !uuidRegex.test(connectionId)) {
      return false;
    }
    const connection = await this.connectionRepository.findOne(connectionId);
    if (!connection) {
      return false;
    }
    if (connection.isTestConnection) {
      return true;
    }
    const testConnectionsHosts = Constants.getTestConnectionsArr().map((el) => el.host);
    return testConnectionsHosts.includes(connection.host);
  }

  async refreshConnectionAgentToken(cognitoUserName, connectionId): Promise<{ token: string }> {
    const refreshedToken = await this.agentService.refreshConnectionAgentToken(cognitoUserName, connectionId);
    return { token: refreshedToken };
  }

  async restore(cognitoUserName, connectionData, connectionId, masterPwd): Promise<IConnectionRO> {
    const toUpdate = await this.connectionRepository.findOne(connectionId);
    if (!toUpdate) {
      throw new HttpException(
        {
          message: Messages.CONNECTION_NOT_FOUND,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    const checkingResult = await this.checkIsHostAllowed(connectionData);
    if (!checkingResult) {
      throw new HttpException(
        {
          message: Messages.CANNOT_CREATE_CONNECTION_TO_THIS_HOST,
        },
        HttpStatus.FORBIDDEN,
      );
    }

    let connectionToken = undefined;

    toUpdate.title = connectionData.title;
    toUpdate.type = connectionData.type;
    toUpdate.ssh = connectionData.ssh;
    toUpdate.ssl = connectionData.ssl;
    toUpdate.isTestConnection = connectionData.isTestConnection;
    if (!isConnectionEntityAgent(connectionData)) {
      toUpdate.masterEncryption = connectionData.masterEncryption;
      toUpdate.host = connectionData.host;
      toUpdate.port = connectionData.port;
      toUpdate.username =
        connectionData.masterEncryption && masterPwd
          ? Encryptor.encryptDataMasterPwd(connectionData.username, masterPwd)
          : connectionData.username;
      toUpdate.password =
        connectionData.masterEncryption && masterPwd
          ? Encryptor.encryptDataMasterPwd(connectionData.password, masterPwd)
          : connectionData.password;
      toUpdate.database =
        connectionData.masterEncryption && masterPwd
          ? Encryptor.encryptDataMasterPwd(connectionData.database, masterPwd)
          : connectionData.database;
      toUpdate.sid = connectionData.sid;
      toUpdate.privateSSHKey =
        connectionData.masterEncryption && masterPwd
          ? Encryptor.encryptDataMasterPwd(connectionData.privateSSHKey, masterPwd)
          : connectionData.privateSSHKey;
      toUpdate.sshHost =
        connectionData.masterEncryption && masterPwd
          ? Encryptor.encryptDataMasterPwd(connectionData.sshHost, masterPwd)
          : connectionData.sshHost;
      toUpdate.sshPort = connectionData.sshPort ? connectionData.sshPort : undefined;
      toUpdate.sshUsername =
        connectionData.masterEncryption && masterPwd
          ? Encryptor.encryptDataMasterPwd(connectionData.sshUsername, masterPwd)
          : connectionData.sshUsername;
      toUpdate.cert = connectionData.cert;
      toUpdate.schema = connectionData.schema;
    } else {
      toUpdate.agent = await this.agentService.createAgent();
      connectionToken = toUpdate.agent.token;
    }
    const updated = await this.connectionRepository.save(toUpdate);
    let updatedConnection = await this.connectionRepository.findOne(updated.id);
    if (updatedConnection.masterEncryption && masterPwd) {
      updatedConnection = Encryptor.decryptConnectionCredentials(updatedConnection, masterPwd);
    }

    if (isConnectionTypeAgent(updatedConnection.type)) {
      updatedConnection['token'] = connectionToken;
    }
    return this.buildConnectionRO(updatedConnection);
  }

  async validateConnectionAgentToken(connectionToken: string): Promise<boolean> {
    connectionToken = Encryptor.hashDataHMAC(connectionToken);
    const qb = await getRepository(ConnectionEntity)
      .createQueryBuilder('connection')
      .leftJoinAndSelect('connection.agent', 'agent');
    qb.andWhere('agent.token = :agentToken', { agentToken: connectionToken });
    const result = await qb.getOne();
    return !!result;
  }

  private async checkIsHostAllowed(connectionData: CreateConnectionDto) {
    if (isConnectionEntityAgent(connectionData) || process.env.NODE_ENV === 'test') {
      return true;
    }
    return new Promise<boolean>((resolve, reject) => {
      const testHosts = Constants.getTestConnectionsHostNamesArr();
      if (!connectionData.ssh) {
        dns.lookup(connectionData.host, (err, address, family) => {
          if (ipRangeCheck(address, Constants.FORBIDDEN_HOSTS) && !testHosts.includes(connectionData.host)) {
            resolve(false);
          } else {
            resolve(true);
          }
          if (err) {
            reject(err);
          }
        });
      } else if (connectionData.ssh && connectionData.sshHost) {
        dns.lookup(connectionData.sshHost, (err, address, family) => {
          if (ipRangeCheck(address, Constants.FORBIDDEN_HOSTS) && !testHosts.includes(connectionData.host)) {
            resolve(false);
          } else {
            resolve(true);
          }
          if (err) {
            reject(err);
          }
        });
      }
    }).catch((e) => {
      console.error('DNS lookup error message', e.message);
      return false;
    });
  }

  private buildConnectionRO(connection: ConnectionEntity): IConnectionRO {
    const connectionRO = {
      title: connection.title,
      masterEncryption: connection.masterEncryption,
      type: connection.type,
      host: connection.host,
      port: connection.port,
      username: connection.username,
      database: connection.database,
      schema: connection.schema,
      sid: connection.sid,
      createdAt: connection.createdAt,
      updatedAt: connection.updatedAt,
      author: connection.author,
      id: connection.id,
      ssh: connection.ssh,
      sshHost: connection.sshHost,
      sshPort: connection.sshPort,
      sshUsername: connection.sshUsername,
      ssl: connection.ssl,
      cert: connection.cert,
      groups: connection.groups,
      azure_encryption: connection.azure_encryption,
      token: connection['token'] ? connection['token'] : undefined,
    };
    if (isConnectionTypeAgent(connectionRO.type)) {
      for (const key in connectionRO) {
        if (key !== 'id' && key !== 'title' && key !== 'type' && key !== 'token' && connectionRO.hasOwnProperty(key)) {
          // added has own property check to avoid object injection
          // eslint-disable-next-line security/detect-object-injection
          delete connectionRO[key];
        }
      }
    }
    return { connection: connectionRO };
  }
}
