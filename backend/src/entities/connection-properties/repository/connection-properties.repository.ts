import { EntityRepository, getRepository, Repository } from 'typeorm';
import { ConnectionPropertiesEntity } from '../connection-properties.entity';
import { IConnectionPropertiesRepository } from './connection-properties.repository.interface';

@EntityRepository(ConnectionPropertiesEntity)
export class ConnectionPropertiesRepository
  extends Repository<ConnectionPropertiesEntity>
  implements IConnectionPropertiesRepository
{
  constructor() {
    super();
  }

  public async findConnectionProperties(connectionId: string): Promise<ConnectionPropertiesEntity> {
    const qb = await getRepository(ConnectionPropertiesEntity)
      .createQueryBuilder('connectionProperties')
      .leftJoinAndSelect('connectionProperties.connection', 'connection');
    qb.where('1=1');
    qb.andWhere('connectionProperties.connection.id = :connection_id', { connection_id: connectionId });
    return await qb.getOne();
  }

  public async saveNewConnectionProperties(
    connectionProperties: ConnectionPropertiesEntity,
  ): Promise<ConnectionPropertiesEntity> {
    return this.save(connectionProperties);
  }

  public async removeConnectionProperties(
    connectionProperties: ConnectionPropertiesEntity,
  ): Promise<ConnectionPropertiesEntity> {
    return await this.remove(connectionProperties);
  }
}
