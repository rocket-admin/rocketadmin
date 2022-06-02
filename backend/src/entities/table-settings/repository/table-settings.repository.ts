import { EntityRepository, getRepository, Repository } from 'typeorm';
import { TableSettingsEntity } from '../table-settings.entity';
import { ITableSettingsRepository } from './table-settings.repository.interface';
import { HttpException } from '@nestjs/common/exceptions/http.exception';
import { Messages } from '../../../exceptions/text/messages';
import { HttpStatus } from '@nestjs/common';
import { CreateTableSettingsDs } from '../application/data-structures/create-table-settings.ds';
import { ConnectionEntity } from '../../connection/connection.entity';
import { buildNewTableSettingsEntity } from '../utils/build-new-table-settings-entity';

@EntityRepository(TableSettingsEntity)
export class TableSettingsRepository extends Repository<TableSettingsEntity> implements ITableSettingsRepository {
  constructor() {
    super();
  }

  public async saveNewOrUpdatedSettings(settings: TableSettingsEntity): Promise<TableSettingsEntity> {
    return await this.save(settings);
  }

  public async createNewTableSettings(settings: CreateTableSettingsDs): Promise<TableSettingsEntity> {
    const connectionQB = await getRepository(ConnectionEntity)
      .createQueryBuilder('connection')
      .where('1=1')
      .andWhere('connection.id = :connectionId', { connectionId: settings.connection_id });
    const foundConnection = await connectionQB.getOne();
    const newTableSettings = buildNewTableSettingsEntity(settings, foundConnection);
    return await this.save(newTableSettings);
  }

  public async findTableSettingsWithCustomFields(
    connectionId: string,
    tableName: string,
  ): Promise<TableSettingsEntity> {
    const qb = await getRepository(TableSettingsEntity)
      .createQueryBuilder('tableSettings')
      .leftJoinAndSelect('tableSettings.custom_fields', 'custom_fields');
    qb.where('1=1');
    qb.andWhere('tableSettings.connection_id = :connection_id', {
      connection_id: connectionId,
    });
    qb.andWhere('tableSettings.table_name = :table_name', {
      table_name: tableName,
    });
    try {
      return await qb.getOne();
    } catch (e) {
      console.info(`Table setting not found exception. => `, e.message);
      throw new HttpException(
        {
          message: Messages.TABLE_SETTINGS_NOT_FOUND,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  public async findTableSettings(connectionId: string, tableName: string): Promise<TableSettingsEntity> {
    const qb = await getRepository(TableSettingsEntity)
      .createQueryBuilder('tableSettings')
      .leftJoinAndSelect('tableSettings.connection_id', 'connection_id');
    qb.where('1=1');
    qb.andWhere('tableSettings.connection_id = :connection_id', { connection_id: connectionId });
    qb.andWhere('tableSettings.table_name = :table_name', { table_name: tableName });
    return await qb.getOne();
  }

  //todo: remove after dao's and table settings refactor
  public async findTableSettingsOrReturnEmpty(connectionId: string, tableName: string): Promise<any> {
    const foundSettings = await this.findTableSettings(connectionId, tableName);
    return foundSettings ? foundSettings : {};
  }

  public async removeTableSettings(tableSettings: TableSettingsEntity): Promise<TableSettingsEntity> {
    return await this.remove(tableSettings);
  }

  public async findTableSettingsInConnection(connectionId: string): Promise<Array<TableSettingsEntity>> {
    const qb = await getRepository(TableSettingsEntity)
      .createQueryBuilder('tableSettings')
      .leftJoinAndSelect('tableSettings.connection_id', 'connection_id');
    qb.where('1=1');
    qb.andWhere('tableSettings.connection_id = :connection_id', { connection_id: connectionId });
    return await qb.getMany();
  }

  public async findTableSettingsWithTableWidgets(
    connectionId: string,
    tableName: string,
  ): Promise<TableSettingsEntity> {
    const qb = await getRepository(TableSettingsEntity)
      .createQueryBuilder('tableSettings')
      .leftJoinAndSelect('tableSettings.table_widgets', 'table_widgets');
    qb.where('1=1');
    qb.andWhere('tableSettings.connection_id = :connection_id', { connection_id: connectionId });
    qb.andWhere('tableSettings.table_name = :table_name', { table_name: tableName });
    return await qb.getOne();
  }
}
