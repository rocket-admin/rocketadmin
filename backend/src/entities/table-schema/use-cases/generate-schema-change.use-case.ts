import { BadRequestException, Inject, Injectable, Logger, NotFoundException, Scope } from '@nestjs/common';
import { getDataAccessObject } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/create-data-access-object.js';
import { ConnectionTypesEnum } from '@rocketadmin/shared-code/dist/src/shared/enums/connection-types-enum.js';
import { AICoreService, AIProviderType, MessageBuilder } from '../../../ai-core/index.js';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { runSchemaChangeAiLoop } from '../ai/run-schema-change-ai-loop.js';
import { buildSchemaChangePrompt } from '../ai/schema-change-prompts.js';
import {
	createDynamoDbSchemaChangeTools,
	createElasticsearchSchemaChangeTools,
	createMongoSchemaChangeTools,
	createSchemaChangeTools,
} from '../ai/schema-change-tools.js';
import { GenerateSchemaChangeDs } from '../application/data-structures/generate-schema-change.ds.js';
import { SchemaChangeResponseDto } from '../application/data-transfer-objects/schema-change-response.dto.js';
import {
	isDynamoDbSchemaChangeType,
	isElasticsearchSchemaChangeType,
	isMongoSchemaChangeType,
	SchemaChangeStatusEnum,
	SchemaChangeTypeEnum,
} from '../table-schema-change-enums.js';
import {
	assertDialectSupported,
	isDynamoDbDialect,
	isElasticsearchDialect,
	isMongoDialect,
} from '../utils/assert-dialect-supported.js';
import { validateProposedDynamoDbOp } from '../utils/dynamodb-schema-op.js';
import { validateProposedElasticsearchOp } from '../utils/elasticsearch-schema-op.js';
import { mapSchemaChangeToResponseDto } from '../utils/map-schema-change-to-response-dto.js';
import { validateProposedMongoOp } from '../utils/mongo-schema-op.js';
import { validateProposedDdl } from '../utils/validate-proposed-ddl.js';
import { IGenerateSchemaChange } from './table-schema-use-cases.interface.js';

@Injectable({ scope: Scope.REQUEST })
export class GenerateSchemaChangeUseCase
	extends AbstractUseCase<GenerateSchemaChangeDs, SchemaChangeResponseDto>
	implements IGenerateSchemaChange
{
	private readonly logger = new Logger(GenerateSchemaChangeUseCase.name);
	private readonly provider: AIProviderType = AIProviderType.BEDROCK;

	constructor(
		@Inject(BaseType.GLOBAL_DB_CONTEXT)
		protected _dbContext: IGlobalDatabaseContext,
		private readonly aiCoreService: AICoreService,
	) {
		super();
	}

	protected async implementation(inputData: GenerateSchemaChangeDs): Promise<SchemaChangeResponseDto> {
		const { connectionId, userPrompt, userId, masterPassword } = inputData;

		const connection = await this._dbContext.connectionRepository.findAndDecryptConnection(
			connectionId,
			masterPassword,
		);
		if (!connection) {
			throw new NotFoundException(Messages.CONNECTION_NOT_FOUND);
		}

		const connectionType = connection.type as ConnectionTypesEnum;
		assertDialectSupported(connectionType);

		const connectionProperties =
			await this._dbContext.connectionPropertiesRepository.findConnectionProperties(connectionId);
		if (connectionProperties && !connectionProperties.allow_ai_requests) {
			throw new BadRequestException(Messages.AI_REQUESTS_NOT_ALLOWED);
		}

		const dao = getDataAccessObject(connection);
		const tableList = await dao.getTablesFromDB();
		const tableNames = tableList.map((t) => t.tableName);

		const systemPrompt = buildSchemaChangePrompt(connectionType, tableNames, connection.schema ?? null);
		const messages = new MessageBuilder().system(systemPrompt).human(userPrompt).build();
		const tools = isMongoDialect(connectionType)
			? createMongoSchemaChangeTools()
			: isDynamoDbDialect(connectionType)
				? createDynamoDbSchemaChangeTools()
				: isElasticsearchDialect(connectionType)
					? createElasticsearchSchemaChangeTools()
					: createSchemaChangeTools();

		let proposal;
		try {
			const result = await runSchemaChangeAiLoop({
				aiCoreService: this.aiCoreService,
				provider: this.provider,
				messages,
				tools,
				dao,
				userEmail: undefined,
				logger: this.logger,
			});
			proposal = result.proposal;
		} catch (err) {
			this.logger.error(`AI loop failed: ${(err as Error).message}`);
			throw new BadRequestException(`AI generation failed: ${(err as Error).message}`);
		}

		if (isMongoSchemaChangeType(proposal.changeType)) {
			validateProposedMongoOp({
				opJson: proposal.forwardSql,
				changeType: proposal.changeType,
				targetTableName: proposal.targetTableName,
			});
			if (proposal.rollbackSql) {
				validateProposedMongoOp({
					opJson: proposal.rollbackSql,
					changeType: proposal.changeType,
					targetTableName: proposal.targetTableName,
					allowAnyOperation: true,
				});
			}
		} else if (isDynamoDbSchemaChangeType(proposal.changeType)) {
			validateProposedDynamoDbOp({
				opJson: proposal.forwardSql,
				changeType: proposal.changeType,
				targetTableName: proposal.targetTableName,
			});
			if (proposal.rollbackSql) {
				validateProposedDynamoDbOp({
					opJson: proposal.rollbackSql,
					changeType: proposal.changeType,
					targetTableName: proposal.targetTableName,
					allowAnyOperation: true,
				});
			}
		} else if (isElasticsearchSchemaChangeType(proposal.changeType)) {
			validateProposedElasticsearchOp({
				opJson: proposal.forwardSql,
				changeType: proposal.changeType,
				targetTableName: proposal.targetTableName,
			});
			if (proposal.rollbackSql) {
				validateProposedElasticsearchOp({
					opJson: proposal.rollbackSql,
					changeType: proposal.changeType,
					targetTableName: proposal.targetTableName,
					allowAnyOperation: true,
				});
			}
		} else {
			validateProposedDdl({
				sql: proposal.forwardSql,
				connectionType,
				changeType: proposal.changeType,
				targetTableName: proposal.targetTableName,
			});
			if (proposal.rollbackSql) {
				validateProposedDdl({
					sql: proposal.rollbackSql,
					connectionType,
					changeType: SchemaChangeTypeEnum.ROLLBACK,
					targetTableName: proposal.targetTableName,
				});
			}
		}

		const latestApplied = await this._dbContext.tableSchemaChangeRepository.findLatestAppliedChange(connectionId);

		const saved = await this._dbContext.tableSchemaChangeRepository.createPendingChange({
			connectionId,
			authorId: userId,
			previousChangeId: latestApplied?.id ?? null,
			forwardSql: proposal.forwardSql,
			rollbackSql: proposal.rollbackSql ?? null,
			userModifiedSql: null,
			status: SchemaChangeStatusEnum.PENDING,
			changeType: proposal.changeType,
			targetTableName: proposal.targetTableName,
			databaseType: connectionType,
			isReversible: !!proposal.isReversible,
			userPrompt,
			aiSummary: proposal.summary ?? null,
			aiReasoning: proposal.reasoning ?? null,
			aiModelUsed:
				this.aiCoreService.getAvailableProviders().find((p) => p.type === this.provider)?.defaultModel ?? null,
		});

		return mapSchemaChangeToResponseDto(saved);
	}
}
