import { SchemaChangeResponseDto } from '../application/data-transfer-objects/schema-change-response.dto.js';
import { TableSchemaChangeEntity } from '../table-schema-change.entity.js';

export function mapSchemaChangeToResponseDto(entity: TableSchemaChangeEntity): SchemaChangeResponseDto {
	return {
		id: entity.id,
		connectionId: entity.connectionId,
		batchId: entity.batchId,
		orderInBatch: entity.orderInBatch,
		authorId: entity.authorId,
		previousChangeId: entity.previousChangeId,
		forwardSql: entity.forwardSql,
		rollbackSql: entity.rollbackSql,
		userModifiedSql: entity.userModifiedSql,
		status: entity.status,
		changeType: entity.changeType,
		targetTableName: entity.targetTableName,
		databaseType: entity.databaseType,
		executionError: entity.executionError,
		isReversible: entity.isReversible,
		autoRollbackAttempted: entity.autoRollbackAttempted,
		autoRollbackSucceeded: entity.autoRollbackSucceeded,
		userPrompt: entity.userPrompt,
		aiSummary: entity.aiSummary,
		aiReasoning: entity.aiReasoning,
		aiModelUsed: entity.aiModelUsed,
		createdAt: entity.createdAt,
		appliedAt: entity.appliedAt,
		rolledBackAt: entity.rolledBackAt,
	};
}
