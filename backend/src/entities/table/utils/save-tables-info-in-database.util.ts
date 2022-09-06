import PQueue from 'p-queue';
import { ConnectionEntity } from '../../connection/connection.entity';
import { ITableStructure } from '../../../data-access-layer/shared/data-access-object-interface';
import { createDataAccessObject } from '../../../data-access-layer/shared/create-data-access-object';
import { TableFieldInfoEntity } from '../../table-field-info/table-field-info.entity';
import { getRepository } from 'typeorm';
import * as Sentry from '@sentry/node';
import { TableInfoEntity } from '../../table-info/table-info.entity';

export async function saveTablesInfoInDatabaseUtil(
  connection: ConnectionEntity,
  userId: string,
  tables: Array<string>,
): Promise<void> {
  try {
    const queue = new PQueue({ concurrency: 3 });
    const dao = createDataAccessObject(connection, userId);
    const connectionRepository = await getRepository(ConnectionEntity);
    const tablesStructures: Array<{
      tableName: string;
      structure: Array<ITableStructure>;
    }> = await Promise.all(
      tables.map(async (tableName) => {
        return await queue.add(async () => {
          const structure = await dao.getTableStructure(tableName, undefined);
          return {
            tableName: tableName,
            structure: structure,
          };
        });
      }),
    );
    connection.tables_info = await Promise.all(
      tablesStructures.map(async (tableStructure) => {
        return await queue.add(async () => {
          const tableInfoRepository = await getRepository(TableInfoEntity);
          const tableFieldInfoRepository = await getRepository(TableFieldInfoEntity);
          const newTableInfo = buildTableInfoEntity(tableStructure.tableName, connection);
          const savedTableInfo = await tableInfoRepository.save(newTableInfo);
          const newTableFieldsInfos = tableStructure.structure.map((el) =>
            buildTableFieldInfoEntity(el, savedTableInfo),
          );
          newTableInfo.table_fields_info = await tableFieldInfoRepository.save(newTableFieldsInfos);
          await tableInfoRepository.save(newTableInfo);
          return newTableInfo;
        });
      }),
    );
    connection.saved_table_info = ++connection.saved_table_info;
    await connectionRepository.save(connection);
  } catch (e) {
    Sentry.captureException(e);
    console.error(e);
  }
}

function buildTableFieldInfoEntity(structure: ITableStructure, tableInfo: TableInfoEntity): TableFieldInfoEntity {
  const newTableFieldInfoEntity = new TableFieldInfoEntity();
  newTableFieldInfoEntity.column_name = structure.column_name;
  newTableFieldInfoEntity.data_type = structure.data_type;
  if (structure.character_maximum_length) {
    newTableFieldInfoEntity.character_maximum_length = structure.character_maximum_length.toString();
  }
  newTableFieldInfoEntity.allow_null = structure.allow_null;
  newTableFieldInfoEntity.column_default = structure.column_default;
  newTableFieldInfoEntity.data_type_params = structure.data_type_params;
  newTableFieldInfoEntity.udt_name = structure.udt_name;
  newTableFieldInfoEntity.table_info = tableInfo;
  return newTableFieldInfoEntity;
}

function buildTableInfoEntity(tableName: string, connection: ConnectionEntity): TableInfoEntity {
  const newTableInfoEntity = new TableInfoEntity();
  newTableInfoEntity.table_name = tableName;
  newTableInfoEntity.connection = connection;
  newTableInfoEntity.table_fields_info = [];
  return newTableInfoEntity;
}
