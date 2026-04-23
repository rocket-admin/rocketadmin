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
import { ApproveSchemaChangeDs } from '../application/data-structures/approve-schema-change.ds.js';
import { SchemaChangeResponseDto } from '../application/data-transfer-objects/schema-change-response.dto.js';
import { isMongoSchemaChangeType, SchemaChangeStatusEnum } from '../table-schema-change-enums.js';
import { assertDialectSupported } from '../utils/assert-dialect-supported.js';
import { mapSchemaChangeToResponseDto } from '../utils/map-schema-change-to-response-dto.js';
import { executeMongoSchemaOp, validateProposedMongoOp } from '../utils/mongo-schema-op.js';
import { validateProposedDdl } from '../utils/validate-proposed-ddl.js';
import { IApproveSchemaChange } from './table-schema-use-cases.interface.js';

@Injectable({ scope: Scope.REQUEST })
export class ApproveAndApplySchemaChangeUseCase
	extends AbstractUseCase<ApproveSchemaChangeDs, SchemaChangeResponseDto>
	implements IApproveSchemaChange
{
	private readonly logger = new Logger(ApproveAndApplySchemaChangeUseCase.name);

	constructor(
		@Inject(BaseType.GLOBAL_DB_CONTEXT)
		protected _dbContext: IGlobalDatabaseContext,
	) {
		super();
	}

	protected async implementation(inputData: ApproveSchemaChangeDs): Promise<SchemaChangeResponseDto> {
		const { changeId, masterPassword, userModifiedSql, confirmedDestructive } = inputData;

		const change = await this._dbContext.tableSchemaChangeRepository.findByIdWithRelations(changeId);
		if (!change) {
			throw new NotFoundException('Schema change not found.');
		}

		if (change.status !== SchemaChangeStatusEnum.PENDING && change.status !== SchemaChangeStatusEnum.APPROVED) {
			throw new ConflictException(`Schema change is ${change.status}; only PENDING or APPROVED can be applied.`);
		}

		if (!change.isReversible && !confirmedDestructive) {
			throw new BadRequestException({
				message: 'This change is not reversible. Re-submit with confirmedDestructive=true to proceed.',
				type: 'destructive_confirmation_required',
			});
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

		let sqlToRun = change.forwardSql;
		if (userModifiedSql && userModifiedSql.trim().length > 0) {
			if (isMongo) {
				validateProposedMongoOp({
					opJson: userModifiedSql,
					changeType: change.changeType,
					targetTableName: change.targetTableName,
				});
			} else {
				validateProposedDdl({
					sql: userModifiedSql,
					connectionType,
					changeType: change.changeType,
					targetTableName: change.targetTableName,
				});
			}
			sqlToRun = userModifiedSql;
			await this._dbContext.tableSchemaChangeRepository.updateStatus(change.id, change.status, {
				userModifiedSql,
			});
		}

		const transitioned = await this._dbContext.tableSchemaChangeRepository.transitionStatusIfMatches(
			change.id,
			change.status,
			SchemaChangeStatusEnum.APPLYING,
		);
		if (!transitioned) {
			throw new ConflictException('Schema change state changed concurrently; refresh and retry.');
		}

		try {
			if (isMongo) {
				const op = validateProposedMongoOp({
					opJson: sqlToRun,
					changeType: change.changeType,
					targetTableName: change.targetTableName,
				});
				await executeMongoSchemaOp(connection, op);
			} else {
				const dao = getDataAccessObject(connection);
				await dao.executeRawQuery(sqlToRun, change.targetTableName, null);
			}
			const updated = await this._dbContext.tableSchemaChangeRepository.updateStatus(
				change.id,
				SchemaChangeStatusEnum.APPLIED,
				{ appliedAt: new Date(), executionError: null },
			);
			return mapSchemaChangeToResponseDto(updated!);
		} catch (err) {
			const error = err as Error;
			this.logger.error(`Forward ${isMongo ? 'Mongo op' : 'SQL'} failed for change ${change.id}: ${error.message}`);

			let autoRollbackSucceeded = false;
			let rollbackError: string | null = null;
			if (change.rollbackSql) {
				try {
					if (isMongo) {
						const rollbackOp = validateProposedMongoOp({
							opJson: change.rollbackSql,
							changeType: change.changeType,
							targetTableName: change.targetTableName,
							allowAnyOperation: true,
						});
						await executeMongoSchemaOp(connection, rollbackOp);
					} else {
						const dao = getDataAccessObject(connection);
						await dao.executeRawQuery(change.rollbackSql, change.targetTableName, null);
					}
					autoRollbackSucceeded = true;
				} catch (rbErr) {
					rollbackError = (rbErr as Error).message;
					this.logger.error(`Auto-rollback failed for change ${change.id}: ${rollbackError}`);
				}
			}

			const composedError = rollbackError ? `${error.message} | auto-rollback failed: ${rollbackError}` : error.message;

			await this._dbContext.tableSchemaChangeRepository.updateStatus(change.id, SchemaChangeStatusEnum.FAILED, {
				executionError: composedError,
				autoRollbackAttempted: !!change.rollbackSql,
				autoRollbackSucceeded,
			});

			throw new BadRequestException({
				message: `Schema change failed: ${error.message}`,
				autoRollbackAttempted: !!change.rollbackSql,
				autoRollbackSucceeded,
			});
		}
	}
}
