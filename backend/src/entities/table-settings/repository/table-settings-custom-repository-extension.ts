import { HttpException, HttpStatus } from '@nestjs/common';
import { Messages } from '../../../exceptions/text/messages.js';
import { ConnectionEntity } from '../../connection/connection.entity.js';
import { CreateTableSettingsDs } from '../application/data-structures/create-table-settings.ds.js';
import { TableSettingsEntity } from '../table-settings.entity.js';
import { buildNewTableSettingsEntity } from '../utils/build-new-table-settings-entity.js';
import { ITableSettingsRepository } from './table-settings.repository.interface.js';

export const tableSettingsCustomRepositoryExtension: ITableSettingsRepository = {
  async saveNewOrUpdatedSettings(settings: TableSettingsEntity): Promise<TableSettingsEntity> {
    return await this.save(settings);
  },

  async createNewTableSettings(settings: CreateTableSettingsDs): Promise<TableSettingsEntity> {
    const connectionQB = this.manager
      .getRepository(ConnectionEntity)
      .createQueryBuilder('connection')
      .andWhere('connection.id = :connectionId', {
        connectionId: settings.connection_id,
      });
    const foundConnection = await connectionQB.getOne();
    const newTableSettings = buildNewTableSettingsEntity(settings, foundConnection);
    return await this.save(newTableSettings);
  },

  async findTableSettingsWithCustomFields(connectionId: string, tableName: string): Promise<TableSettingsEntity> {
    const qb = this.createQueryBuilder('tableSettings').leftJoinAndSelect(
      'tableSettings.custom_fields',
      'custom_fields',
    );
    qb.where('tableSettings.connection_id = :connection_id', {
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
  },

  async findTableSettings(connectionId: string, tableName: string): Promise<TableSettingsEntity> {
    const qb = this.createQueryBuilder('tableSettings').leftJoinAndSelect(
      'tableSettings.connection_id',
      'connection_id',
    );
    qb.where('tableSettings.connection_id = :connection_id', { connection_id: connectionId });
    qb.andWhere('tableSettings.table_name = :table_name', { table_name: tableName });
    return await qb.getOne();
  },

  async findTableSettingsPure(connectionId: string, tableName: string): Promise<TableSettingsEntity> {
    return await this.createQueryBuilder('tableSettings')
      .leftJoin('tableSettings.connection_id', 'connection_id')
      .where('tableSettings.connection_id = :connection_id', { connection_id: connectionId })
      .andWhere('tableSettings.table_name = :table_name', { table_name: tableName })
      .getOne();
  },

  //todo: remove after dao's and table settings refactor
  async findTableSettingsOrReturnEmpty(connectionId: string, tableName: string): Promise<any> {
    const foundSettings = await this.findTableSettings(connectionId, tableName);
    return foundSettings ? foundSettings : {};
  },

  async findTableSettingsInConnection(connectionId: string): Promise<Array<TableSettingsEntity>> {
    const qb = this.createQueryBuilder('tableSettings').leftJoinAndSelect(
      'tableSettings.connection_id',
      'connection_id',
    );
    qb.where('tableSettings.connection_id = :connection_id', { connection_id: connectionId });
    return await qb.getMany();
  },

  async findTableSettingsInConnectionPure(connectionId: string): Promise<Array<TableSettingsEntity>> {
    return await this.createQueryBuilder('tableSettings')
      .leftJoin('tableSettings.connection_id', 'connection_id')
      .where('tableSettings.connection_id = :connection_id', { connection_id: connectionId })
      .getMany();
  },

  async findTableSettingsWithTableWidgets(connectionId: string, tableName: string): Promise<TableSettingsEntity> {
    const qb = this.createQueryBuilder('tableSettings').leftJoinAndSelect(
      'tableSettings.table_widgets',
      'table_widgets',
    );
    qb.where('tableSettings.connection_id = :connection_id', { connection_id: connectionId });
    qb.andWhere('tableSettings.table_name = :table_name', { table_name: tableName });
    return await qb.getOne();
  },

  async findTableSettingsWithTableActions(connectionId: string, tableName: string): Promise<TableSettingsEntity> {
    const qb = this.createQueryBuilder('tableSettings').leftJoinAndSelect(
      'tableSettings.table_actions',
      'table_actions',
    );
    qb.where('tableSettings.connection_id = :connection_id', { connection_id: connectionId });
    qb.andWhere('tableSettings.table_name = :table_name', { table_name: tableName });
    return await qb.getOne();
  },

  async removeTableSettings(tableSettings: TableSettingsEntity): Promise<TableSettingsEntity> {
    return await this.remove(tableSettings);
  },
};
