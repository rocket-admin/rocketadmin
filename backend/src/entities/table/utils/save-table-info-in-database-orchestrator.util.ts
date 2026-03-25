import { getDataAccessObject } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/create-data-access-object.js';
import { TableDS } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/data-structures/table.ds.js';
import { TableStructureDS } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/data-structures/table-structure.ds.js';
import * as Sentry from '@sentry/node';
import PQueue from 'p-queue';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { TableInfoEntity } from '../../table-info/table-info.entity.js';
import { buildTableFieldInfoEntity, buildTableInfoEntity } from './save-tables-info-in-database.util.js';

export async function saveTableInfoInDatabase(
	connectionId: string,
	tables: Array<TableDS>,
	masterPwd: string,
	dbContext: IGlobalDatabaseContext,
): Promise<void> {
	try {
		const foundConnection = await dbContext.connectionRepository.findOne({ where: { id: connectionId } });
		if (!foundConnection) {
			return;
		}
		const decryptedConnection = await dbContext.connectionRepository.findAndDecryptConnection(
			connectionId,
			masterPwd,
		);
		const tableNames: Array<string> = tables.map((table) => table.tableName);
		const queue = new PQueue({ concurrency: 2 });
		const dao = getDataAccessObject(decryptedConnection);
		const tablesStructures: Array<{
			tableName: string;
			structure: Array<TableStructureDS>;
		}> = (await Promise.all(
			tableNames.map(async (tableName) => {
				return await queue.add(async () => {
					const structure = await dao.getTableStructure(tableName, undefined);
					return {
						tableName: tableName,
						structure: structure,
					};
				});
			}),
		)) as Array<{
			tableName: string;
			structure: Array<TableStructureDS>;
		}>;
		foundConnection.tables_info = (await Promise.all(
			tablesStructures.map(async (tableStructure) => {
				return await queue.add(async () => {
					const newTableInfo = buildTableInfoEntity(tableStructure.tableName, foundConnection);
					const savedTableInfo = await dbContext.tableInfoRepository.save(newTableInfo);
					const newTableFieldsInfos = tableStructure.structure.map((el) =>
						buildTableFieldInfoEntity(el, savedTableInfo),
					);
					newTableInfo.table_fields_info = await dbContext.tableFieldInfoRepository.save(newTableFieldsInfos);
					await dbContext.tableInfoRepository.save(newTableInfo);
					return newTableInfo;
				});
			}),
		)) as Array<TableInfoEntity>;
		foundConnection.saved_table_info = ++foundConnection.saved_table_info;
		await dbContext.connectionRepository.saveUpdatedConnection(foundConnection);
	} catch (e) {
		Sentry.captureException(e);
		console.error(e);
	}
}
