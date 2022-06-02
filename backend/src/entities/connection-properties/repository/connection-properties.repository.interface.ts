import { ConnectionPropertiesEntity } from '../connection-properties.entity';

export interface IConnectionPropertiesRepository {
  findConnectionProperties(connectionId: string): Promise<ConnectionPropertiesEntity>;

  saveNewConnectionProperties(connectionProperties: ConnectionPropertiesEntity): Promise<ConnectionPropertiesEntity>;

  removeConnectionProperties(connectionProperties: ConnectionPropertiesEntity): Promise<ConnectionPropertiesEntity>;
}
