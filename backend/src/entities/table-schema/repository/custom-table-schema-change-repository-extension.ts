import { Repository } from 'typeorm';
import { TableSchemaChangeEntity } from '../table-schema-change.entity.js';
import { SchemaChangeStatusEnum } from '../table-schema-change-enums.js';
import {
	ITableSchemaChangeRepository,
	UpdateSchemaChangeStatusMeta,
} from './table-schema-change.repository.interface.js';

export const customTableSchemaChangeRepositoryExtension: ITableSchemaChangeRepository &
	ThisType<Repository<TableSchemaChangeEntity> & ITableSchemaChangeRepository> = {
	async createPendingChange(data: Partial<TableSchemaChangeEntity>): Promise<TableSchemaChangeEntity> {
		const entity = this.create({
			...data,
			status: SchemaChangeStatusEnum.PENDING,
		});
		return await this.save(entity);
	},

	async findByIdWithRelations(id: string): Promise<TableSchemaChangeEntity | null> {
		return await this.findOne({
			where: { id },
			relations: ['connection', 'author', 'previousChange'],
		});
	},

	async findByConnectionPaginated(
		connectionId: string,
		options: { limit: number; offset: number },
	): Promise<[TableSchemaChangeEntity[], number]> {
		return await this.findAndCount({
			where: { connectionId },
			order: { createdAt: 'DESC' },
			skip: options.offset,
			take: options.limit,
		});
	},

	async updateStatus(
		id: string,
		status: SchemaChangeStatusEnum,
		meta?: UpdateSchemaChangeStatusMeta,
	): Promise<TableSchemaChangeEntity | null> {
		const patch: Partial<TableSchemaChangeEntity> = { status };
		if (meta) {
			if (meta.executionError !== undefined) {
				patch.executionError = meta.executionError;
			}
			if (meta.appliedAt !== undefined) {
				patch.appliedAt = meta.appliedAt;
			}
			if (meta.rolledBackAt !== undefined) {
				patch.rolledBackAt = meta.rolledBackAt;
			}
			if (meta.autoRollbackAttempted !== undefined) {
				patch.autoRollbackAttempted = meta.autoRollbackAttempted;
			}
			if (meta.autoRollbackSucceeded !== undefined) {
				patch.autoRollbackSucceeded = meta.autoRollbackSucceeded;
			}
			if (meta.userModifiedSql !== undefined) {
				patch.userModifiedSql = meta.userModifiedSql;
			}
		}
		await this.update({ id }, patch);
		return await this.findOne({ where: { id } });
	},

	async transitionStatusIfMatches(
		id: string,
		expectedStatus: SchemaChangeStatusEnum,
		nextStatus: SchemaChangeStatusEnum,
	): Promise<boolean> {
		const result = await this.update({ id, status: expectedStatus }, { status: nextStatus });
		return (result.affected ?? 0) > 0;
	},

	async findLatestAppliedChange(connectionId: string): Promise<TableSchemaChangeEntity | null> {
		return await this.findOne({
			where: { connectionId, status: SchemaChangeStatusEnum.APPLIED },
			order: { appliedAt: 'DESC' },
		});
	},
};
