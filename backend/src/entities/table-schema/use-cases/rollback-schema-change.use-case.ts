import {
	BadRequestException,
	ConflictException,
	Inject,
	Injectable,
	Logger,
	NotFoundException,
	Scope,
} from '@nestjs/common';
import { getDataAccessObject } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/create-data-access-object.js';
import { ConnectionTypesEnum } from '@rocketadmin/shared-code/dist/src/shared/enums/connection-types-enum.js';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { RollbackSchemaChangeDs } from '../application/data-structures/rollback-schema-change.ds.js';
import { SchemaChangeResponseDto } from '../application/data-transfer-objects/schema-change-response.dto.js';
import {
	isDynamoDbSchemaChangeType,
	isMongoSchemaChangeType,
	SchemaChangeStatusEnum,
	SchemaChangeTypeEnum,
} from '../table-schema-change-enums.js';
import {
	assertDialectSupported,
	isCassandraDialect,
	isClickHouseDialect,
	isDynamoDbDialect,
} from '../utils/assert-dialect-supported.js';
import { executeCassandraDdl } from '../utils/cassandra-ddl.js';
import { executeClickHouseDdl } from '../utils/clickhouse-ddl.js';
import { executeDynamoDbSchemaOp, validateProposedDynamoDbOp } from '../utils/dynamodb-schema-op.js';
import { mapSchemaChangeToResponseDto } from '../utils/map-schema-change-to-response-dto.js';
import { executeMongoSchemaOp, validateProposedMongoOp } from '../utils/mongo-schema-op.js';
import { IRollbackSchemaChange } from './table-schema-use-cases.interface.js';

@Injectable({ scope: Scope.REQUEST })
export class RollbackSchemaChangeUseCase
	extends AbstractUseCase<RollbackSchemaChangeDs, SchemaChangeResponseDto>
	implements IRollbackSchemaChange
{
	private readonly logger = new Logger(RollbackSchemaChangeUseCase.name);

	constructor(
		@Inject(BaseType.GLOBAL_DB_CONTEXT)
		protected _dbContext: IGlobalDatabaseContext,
	) {
		super();
	}

	protected async implementation(inputData: RollbackSchemaChangeDs): Promise<SchemaChangeResponseDto> {
		const { changeId, userId, masterPassword } = inputData;

		const change = await this._dbContext.tableSchemaChangeRepository.findByIdWithRelations(changeId);
		if (!change) {
			throw new NotFoundException('Schema change not found.');
		}

		if (change.status !== SchemaChangeStatusEnum.APPLIED) {
			throw new ConflictException(`Only APPLIED changes can be rolled back; this change is ${change.status}.`);
		}

		if (!change.rollbackSql) {
			throw new BadRequestException('This change has no rollback SQL and cannot be reverted.');
		}

		const connectionType = change.databaseType as ConnectionTypesEnum;
		assertDialectSupported(connectionType);

		const connection = await this._dbContext.connectionRepository.findAndDecryptConnection(
			change.connectionId,
			masterPassword,
		);
		if (!connection) {
			throw new NotFoundException(Messages.CONNECTION_NOT_FOUND);
		}

		const isMongo = isMongoSchemaChangeType(change.changeType);
		const isDynamoDb = isDynamoDbSchemaChangeType(change.changeType) || isDynamoDbDialect(connectionType);
		const isClickHouse = isClickHouseDialect(connectionType);
		const isCassandra = isCassandraDialect(connectionType);

		try {
			if (isMongo) {
				const op = validateProposedMongoOp({
					opJson: change.rollbackSql,
					changeType: change.changeType,
					targetTableName: change.targetTableName,
					allowAnyOperation: true,
				});
				await executeMongoSchemaOp(connection, op);
			} else if (isDynamoDb) {
				const op = validateProposedDynamoDbOp({
					opJson: change.rollbackSql,
					changeType: change.changeType,
					targetTableName: change.targetTableName,
					allowAnyOperation: true,
				});
				await executeDynamoDbSchemaOp(connection, op);
			} else if (isClickHouse) {
				await executeClickHouseDdl(connection, change.rollbackSql);
			} else if (isCassandra) {
				await executeCassandraDdl(connection, change.rollbackSql);
			} else {
				const dao = getDataAccessObject(connection);
				await dao.executeRawQuery(change.rollbackSql, change.targetTableName, '');
			}
		} catch (err) {
			const error = err as Error;
			this.logger.error(`Rollback failed for change ${change.id}: ${error.message}`);
			throw new BadRequestException(`Rollback execution failed: ${error.message}`);
		}

		const updated = await this._dbContext.tableSchemaChangeRepository.updateStatus(
			change.id,
			SchemaChangeStatusEnum.ROLLED_BACK,
			{ rolledBackAt: new Date() },
		);

		await this._dbContext.tableSchemaChangeRepository.createPendingChange({
			connectionId: change.connectionId,
			authorId: userId,
			previousChangeId: change.id,
			forwardSql: change.rollbackSql,
			rollbackSql: change.forwardSql,
			userModifiedSql: null,
			status: SchemaChangeStatusEnum.APPLIED,
			changeType: SchemaChangeTypeEnum.ROLLBACK,
			targetTableName: change.targetTableName,
			databaseType: change.databaseType,
			isReversible: true,
			userPrompt: `Manual rollback of change ${change.id}`,
			aiSummary: `Rollback of "${change.aiSummary ?? change.id}"`,
			aiReasoning: null,
			aiModelUsed: null,
			appliedAt: new Date(),
		});

		return mapSchemaChangeToResponseDto(updated!);
	}
}
