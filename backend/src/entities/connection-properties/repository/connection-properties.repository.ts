import { EntityRepository, QueryRunner, Repository } from 'typeorm';
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
    const qb = this.createQueryBuilder(undefined, this.getCurrentQueryRunner())
      .select('connectionProperties')
      .from(ConnectionPropertiesEntity, 'connectionProperties')
      .leftJoinAndSelect('connectionProperties.connection', 'connection');
    qb.where('connectionProperties.connection.id = :connection_id', { connection_id: connectionId });
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

  private getCurrentQueryRunner(): QueryRunner {
    return this.manager.queryRunner;
  }
}
