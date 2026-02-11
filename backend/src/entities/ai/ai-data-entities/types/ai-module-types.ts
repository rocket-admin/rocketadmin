import { ForeignKeyDS } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/data-structures/foreign-key.ds.js';
import { PrimaryKeyDS } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/data-structures/primary-key.ds.js';
import { TableStructureDS } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/data-structures/table-structure.ds.js';

export type TableInformation = {
	table_name: string;
	structure: Array<TableStructureDS>;
	foreignKeys: Array<ForeignKeyDS>;
	primaryColumns: Array<PrimaryKeyDS>;
};
