import { attachPaginate } from 'knex-paginate';
import { KnexManager } from '../../knex-manager/knex-manager.js';
import { ConnectionParams } from '../shared/data-structures/connections-params.ds.js';
import { Knex } from 'knex';
attachPaginate();

export class BasicDataAccessObject {
  protected connection: ConnectionParams;

  constructor(connection: ConnectionParams) {
    this.connection = connection;
  }
  public async configureKnex(): Promise<Knex<any, any[]>> {
    const knexManager = KnexManager.knexStorage();
    return knexManager.get(this.connection.type)(this.connection);
  }
}
