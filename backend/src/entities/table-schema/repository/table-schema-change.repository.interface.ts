import { Repository } from 'typeorm';
import { TableSchemaChangeEntity } from '../table-schema-change.entity.js';
import { SchemaChangeStatusEnum } from '../table-schema-change-enums.js';

export interface UpdateSchemaChangeStatusMeta {
	executionError?: string | null;
	appliedAt?: Date | null;
	rolledBackAt?: Date | null;
	autoRollbackAttempted?: boolean;
	autoRollbackSucceeded?: boolean;
	userModifiedSql?: string | null;
}

export interface ITableSchemaChangeRepository {
	createPendingChange(
		this: Repository<TableSchemaChangeEntity>,
		data: Partial<TableSchemaChangeEntity>,
	): Promise<TableSchemaChangeEntity>;

	findByIdWithRelations(this: Repository<TableSchemaChangeEntity>, id: string): Promise<TableSchemaChangeEntity | null>;

	findByConnectionPaginated(
		this: Repository<TableSchemaChangeEntity>,
		connectionId: string,
		options: { limit: number; offset: number },
	): Promise<[TableSchemaChangeEntity[], number]>;

	updateStatus(
		this: Repository<TableSchemaChangeEntity>,
		id: string,
		status: SchemaChangeStatusEnum,
		meta?: UpdateSchemaChangeStatusMeta,
	): Promise<TableSchemaChangeEntity | null>;

	transitionStatusIfMatches(
		this: Repository<TableSchemaChangeEntity>,
		id: string,
		expectedStatus: SchemaChangeStatusEnum,
		nextStatus: SchemaChangeStatusEnum,
	): Promise<boolean>;

	findLatestAppliedChange(
		this: Repository<TableSchemaChangeEntity>,
		connectionId: string,
	): Promise<TableSchemaChangeEntity | null>;
}
