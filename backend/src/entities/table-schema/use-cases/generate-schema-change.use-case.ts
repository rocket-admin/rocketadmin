import { BaseMessage } from '@langchain/core/messages';
import { BadRequestException, Inject, Injectable, Logger, NotFoundException, Scope } from '@nestjs/common';
import { getDataAccessObject } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/create-data-access-object.js';
import { ConnectionTypesEnum } from '@rocketadmin/shared-code/dist/src/shared/enums/connection-types-enum.js';
import Sentry from '@sentry/minimal';
import crypto from 'crypto';
import { AIProviderType } from '../../../ai-core/interfaces/ai-service.interface.js';
import { AICoreService } from '../../../ai-core/services/ai-core.service.js';
import { MessageBuilder } from '../../../ai-core/utils/message-builder.js';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { MessageRole } from '../../ai/ai-conversation-history/ai-chat-messages/message-role.enum.js';
import { runSchemaChangeAiLoop } from '../ai/run-schema-change-ai-loop.js';
import { buildSchemaChangePrompt } from '../ai/schema-change-prompts.js';
import {
	createDynamoDbSchemaChangeTools,
	createElasticsearchSchemaChangeTools,
	createMongoSchemaChangeTools,
	createSchemaChangeTools,
	ProposeSchemaChangeArgs,
} from '../ai/schema-change-tools.js';
import { GenerateSchemaChangeDs } from '../application/data-structures/generate-schema-change.ds.js';
import { SchemaChangeBatchResponseDto } from '../application/data-transfer-objects/schema-change-batch-response.dto.js';
import { SchemaChangeChatEntity } from '../schema-change-chat/schema-change-chat/schema-change-chat.entity.js';
import { TableSchemaChangeEntity } from '../table-schema-change.entity.js';
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
	extends AbstractUseCase<GenerateSchemaChangeDs, SchemaChangeBatchResponseDto>
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

	protected async implementation(inputData: GenerateSchemaChangeDs): Promise<SchemaChangeBatchResponseDto> {
		const { connectionId, userPrompt, userId, masterPassword, threadId } = inputData;

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

		const { chat, isNewChat } = await this.resolveChat(threadId ?? null, userId, connectionId);

		const dao = getDataAccessObject(connection);
		const tableList = await dao.getTablesFromDB();
		const tableNames = tableList.map((t) => t.tableName);

		const systemPrompt = buildSchemaChangePrompt(connectionType, tableNames, connection.schema ?? null);
		const messages = await this.buildMessagesWithHistory(systemPrompt, userPrompt, chat.id, isNewChat);
		const tools = isMongoDialect(connectionType)
			? createMongoSchemaChangeTools()
			: isDynamoDbDialect(connectionType)
				? createDynamoDbSchemaChangeTools()
				: isElasticsearchDialect(connectionType)
					? createElasticsearchSchemaChangeTools()
					: createSchemaChangeTools();

		await this._dbContext.schemaChangeChatMessageRepository.saveMessage(chat.id, userPrompt, MessageRole.user);

		if (isNewChat) {
			this.generateAndUpdateChatName(chat.id, userPrompt).catch((error) => {
				Sentry.captureException(error);
			});
		}

		let proposals: ProposeSchemaChangeArgs[];
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
			proposals = result.proposals;
		} catch (err) {
			this.logger.error(`AI loop failed: ${(err as Error).message}`);
			throw new BadRequestException(`AI generation failed: ${(err as Error).message}`);
		}

		for (let i = 0; i < proposals.length; i++) {
			this.validateProposal(proposals[i], connectionType, i);
		}

		const latestApplied = await this._dbContext.tableSchemaChangeRepository.findLatestAppliedChange(connectionId);
		const previousChangeId = latestApplied?.id ?? null;
		const aiModelUsed =
			this.aiCoreService.getAvailableProviders().find((p) => p.type === this.provider)?.defaultModel ?? null;

		const batchId = crypto.randomUUID();
		const items: Partial<TableSchemaChangeEntity>[] = proposals.map((proposal, index) => ({
			connectionId,
			batchId,
			orderInBatch: index,
			authorId: userId,
			previousChangeId,
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
			aiModelUsed,
		}));

		const saved = await this._dbContext.tableSchemaChangeRepository.createPendingBatch(items);
		saved.sort((a, b) => a.orderInBatch - b.orderInBatch);

		await this._dbContext.schemaChangeChatMessageRepository.saveMessage(
			chat.id,
			this.serializeAssistantTurn(proposals),
			MessageRole.ai,
			batchId,
		);
		await this._dbContext.schemaChangeChatRepository.updateLastBatchId(chat.id, batchId);

		return {
			batchId,
			threadId: chat.id,
			changes: saved.map(mapSchemaChangeToResponseDto),
		};
	}

	private async resolveChat(
		threadId: string | null,
		userId: string,
		connectionId: string,
	): Promise<{ chat: SchemaChangeChatEntity; isNewChat: boolean }> {
		if (threadId) {
			const existing = await this._dbContext.schemaChangeChatRepository.findChatByIdAndUserId(threadId, userId);
			if (existing) {
				if (existing.connection_id !== connectionId) {
					throw new BadRequestException('Provided threadId belongs to a different connection.');
				}
				return { chat: existing, isNewChat: false };
			}
		}
		const created = await this._dbContext.schemaChangeChatRepository.createChatForUser(userId, connectionId);
		return { chat: created, isNewChat: true };
	}

	private async buildMessagesWithHistory(
		systemPrompt: string,
		userMessage: string,
		chatId: string,
		isNewChat: boolean,
	): Promise<BaseMessage[]> {
		if (isNewChat) {
			return new MessageBuilder().system(systemPrompt).human(userMessage).build();
		}

		const previousMessages = await this._dbContext.schemaChangeChatMessageRepository.findMessagesForChat(chatId);
		const builder = new MessageBuilder().system(systemPrompt);

		for (const msg of previousMessages) {
			if (msg.role === MessageRole.user) {
				builder.human(msg.message);
			} else if (msg.role === MessageRole.ai) {
				builder.ai(msg.message);
			}
		}

		builder.human(userMessage);
		return builder.build();
	}

	private serializeAssistantTurn(proposals: ProposeSchemaChangeArgs[]): string {
		return proposals
			.map((p, i) => {
				const summary = p.summary?.trim() || '(no summary)';
				return `${i + 1}. [${p.changeType}] ${p.targetTableName} — ${summary}`;
			})
			.join('\n');
	}

	private async generateAndUpdateChatName(chatId: string, userMessage: string): Promise<void> {
		try {
			const CHAT_NAME_GENERATION_PROMPT = `Generate a very short, concise title (max 5-6 words) for a database schema-change conversation based on the user's first request.
The title should capture the main intent (e.g. "Add products table", "Rename users column").
Respond ONLY with the title, no quotes, no explanation.
User request: `;
			const prompt = CHAT_NAME_GENERATION_PROMPT + userMessage;
			const messages = new MessageBuilder().human(prompt).build();

			let generatedName = '';
			const stream = await this.aiCoreService.streamChatWithToolsAndProvider(this.provider, messages, []);

			for await (const chunk of stream) {
				if (chunk.type === 'text' && chunk.content) {
					generatedName += chunk.content;
				}
			}

			generatedName = generatedName.trim().slice(0, 100);

			if (generatedName) {
				await this._dbContext.schemaChangeChatRepository.updateChatName(chatId, generatedName);
			}
		} catch (error) {
			Sentry.captureException(error);
		}
	}

	private validateProposal(
		proposal: ProposeSchemaChangeArgs,
		connectionType: ConnectionTypesEnum,
		index: number,
	): void {
		const fieldHint = `proposals[${index}]`;
		try {
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
		} catch (err) {
			const message = (err as Error).message ?? 'validation error';
			throw new BadRequestException(`${fieldHint}: ${message}`);
		}
	}
}
