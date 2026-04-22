import { ApproveSchemaChangeDs } from '../application/data-structures/approve-schema-change.ds.js';
import { GenerateSchemaChangeDs } from '../application/data-structures/generate-schema-change.ds.js';
import { GetSchemaChangeDs } from '../application/data-structures/get-schema-change.ds.js';
import { ListSchemaChangesDs } from '../application/data-structures/list-schema-changes.ds.js';
import { RejectSchemaChangeDs } from '../application/data-structures/reject-schema-change.ds.js';
import { RollbackSchemaChangeDs } from '../application/data-structures/rollback-schema-change.ds.js';
import { SchemaChangeListResponseDto } from '../application/data-transfer-objects/schema-change-list-response.dto.js';
import { SchemaChangeResponseDto } from '../application/data-transfer-objects/schema-change-response.dto.js';

export interface IGenerateSchemaChange {
	execute(inputData: GenerateSchemaChangeDs): Promise<SchemaChangeResponseDto>;
}

export interface IApproveSchemaChange {
	execute(inputData: ApproveSchemaChangeDs): Promise<SchemaChangeResponseDto>;
}

export interface IRejectSchemaChange {
	execute(inputData: RejectSchemaChangeDs): Promise<SchemaChangeResponseDto>;
}

export interface IRollbackSchemaChange {
	execute(inputData: RollbackSchemaChangeDs): Promise<SchemaChangeResponseDto>;
}

export interface IListSchemaChanges {
	execute(inputData: ListSchemaChangesDs): Promise<SchemaChangeListResponseDto>;
}

export interface IGetSchemaChange {
	execute(inputData: GetSchemaChangeDs): Promise<SchemaChangeResponseDto>;
}
