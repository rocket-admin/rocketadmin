import { AgentEntity } from './agent.entity';
import { getRepository, Repository } from 'typeorm';
import { HttpException } from '@nestjs/common/exceptions/http.exception';
import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Messages } from '../../exceptions/text/messages';
import { nanoid } from 'nanoid';

@Injectable()
export class AgentService {
  constructor(
    @InjectRepository(AgentEntity)
    private readonly agentRepository: Repository<AgentEntity>,
  ) {}

  async createAgent(): Promise<AgentEntity> {
    const agent = new AgentEntity();
    const token = nanoid(64);
    if (process.env.NODE_ENV === 'test') {
      agent.token = '_ueF-9gQ4Kv1YVITBn0W_Hzvr5tBBSRmhLEZv2IcejomK2LGBhaFkEzOSB3FvFDW';
    } else {
      agent.token = token;
    }
    const createdAgent = await this.agentRepository.save(agent);
    createdAgent.token = token;
    return createdAgent;
  }

  async findAgent(connectionId) {
    const qb = await getRepository(AgentEntity)
      .createQueryBuilder('agent')
      .leftJoinAndSelect('agent.connection', 'connection')
      .andWhere('connection.id = :connectionId', { connectionId: connectionId });
    return await qb.getOne();
  }

  async refreshConnectionAgentToken(cognitoUserName: string, connectionId: string): Promise<string> {
    const qb = await getRepository(AgentEntity)
      .createQueryBuilder('agent')
      .leftJoinAndSelect('agent.connection', 'connection')
      .andWhere('connection.id = :connectionId', { connectionId: connectionId });
    const foundAgent = await qb.getOne();
    if (!foundAgent) {
      throw new HttpException(
        {
          message: Messages.AGENT_NOT_FOUND,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    const newUuidToken = nanoid(64);
    foundAgent.token = newUuidToken;
    await this.agentRepository.save(foundAgent);
    return newUuidToken;
  }
}
