import { ConnectionPropertiesEntity } from '../connection-properties.entity.js';

export const customConnectionPropertiesRepositoryExtension = {
  async findConnectionProperties(connectionId: string): Promise<ConnectionPropertiesEntity> {
    const qb = this.createQueryBuilder('connectionProperties').leftJoinAndSelect(
      'connectionProperties.connection',
      'connection',
    );
    qb.where('connectionProperties.connection.id = :connection_id', { connection_id: connectionId });
    return await qb.getOne();
  },

  async findConnectionPropertiesWithTablesCategories(connectionId: string): Promise<ConnectionPropertiesEntity> {
    const qb = this.createQueryBuilder('connectionProperties')
      .leftJoin('connectionProperties.connection', 'connection')
      .leftJoinAndSelect('connectionProperties.table_categories', 'table_categories');
    qb.where('connectionProperties.connection.id = :connection_id', { connection_id: connectionId });
    return await qb.getOne();
  },

  async saveNewConnectionProperties(
    connectionProperties: ConnectionPropertiesEntity,
  ): Promise<ConnectionPropertiesEntity> {
    return this.save(connectionProperties);
  },

  async removeConnectionProperties(
    connectionProperties: ConnectionPropertiesEntity,
  ): Promise<ConnectionPropertiesEntity> {
    return await this.remove(connectionProperties);
  },
};
