import { BaseMessage } from '@langchain/core/messages';
import {
	BadRequestException,
	ForbiddenException,
	Inject,
	Injectable,
	Logger,
	NotFoundException,
	Scope,
} from '@nestjs/common';
import { getDataAccessObject } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/create-data-access-object.js';
import { ConnectionTypesEnum } from '@rocketadmin/shared-code/dist/src/shared/enums/connection-types-enum.js';
import { IDataAccessObject } from '@rocketadmin/shared-code/dist/src/shared/interfaces/data-access-object.interface.js';
import { IDataAccessObjectAgent } from '@rocketadmin/shared-code/dist/src/shared/interfaces/data-access-object-agent.interface.js';
import Sentry from '@sentry/minimal';
import { Response } from 'express';
import { AIToolCall, AIToolDefinition } from '../../../ai-core/interfaces/ai-provider.interface.js';
import { AIProviderType } from '../../../ai-core/interfaces/ai-service.interface.js';
import { AICoreService } from '../../../ai-core/services/ai-core.service.js';
import { collectMongoPipelineCollections } from '../../../ai-core/tools/collect-mongo-pipeline-collections.js';
import { createDatabaseTools } from '../../../ai-core/tools/database-tools.js';
import { searchDocumentation } from '../../../ai-core/tools/documentation-search.js';
import { createDatabaseQuerySystemPrompt } from '../../../ai-core/tools/prompts.js';
import {
	isReadOnlyMongoAggregationPipeline,
	isValidMongoDbCommand,
	isValidSQLQuery,
	wrapQueryWithLimit,
} from '../../../ai-core/tools/query-validators.js';
import { MessageBuilder } from '../../../ai-core/utils/message-builder.js';
import { encodeError, encodeToToon } from '../../../ai-core/utils/toon-encoder.js';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { getErrorMessage } from '../../../helpers/get-error-message.js';
import { isConnectionTypeAgent } from '../../../helpers/is-connection-entity-agent.js';
import { slackPostMessage } from '../../../helpers/slack/slack-post-message.js';
import { CedarPermissionsService } from '../../cedar-authorization/cedar-permissions.service.js';
import { ConnectionEntity } from '../../connection/connection.entity.js';
import { assertUserCanReadQueryTables } from '../../visualizations/panel/utils/assert-query-tables-readable.util.js';
import { MessageRole } from '../ai-conversation-history/ai-chat-messages/message-role.enum.js';
import { UserAiChatEntity } from '../ai-conversation-history/user-ai-chat/user-ai-chat.entity.js';
import { IRequestInfoFromTableV2 } from '../ai-use-cases.interface.js';
import { RequestInfoFromTableDSV2 } from '../application/data-structures/request-info-from-table.ds.js';

@Injectable({ scope: Scope.REQUEST })
export class RequestInfoFromTableWithAIUseCaseV7
	extends AbstractUseCase<RequestInfoFromTableDSV2, void>
	implements IRequestInfoFromTableV2
{
	private readonly logger = new Logger(RequestInfoFromTableWithAIUseCaseV7.name);
	private readonly maxDepth: number = 10;
	private readonly aiProvider: AIProviderType = AIProviderType.BEDROCK;

	constructor(
		@Inject(BaseType.GLOBAL_DB_CONTEXT)
		protected _dbContext: IGlobalDatabaseContext,
		private readonly aiCoreService: AICoreService,
		private readonly cedarPermissions: CedarPermissionsService,
	) {
		super();
	}

	public async implementation(inputData: RequestInfoFromTableDSV2): Promise<void> {
		const { connectionId, tableName, user_message, master_password, user_id, response, ai_thread_id } = inputData;

		this.setupResponseHeaders(response);

		const { foundConnection, dataAccessObject, isMongoDb, userEmail } = await this.setupConnection(
			connectionId,
			master_password,
			user_id,
		);

		const tools = createDatabaseTools(isMongoDb);

		const systemPrompt = createDatabaseQuerySystemPrompt(
			tableName,
			foundConnection.type as ConnectionTypesEnum,
			foundConnection.schema ?? undefined,
		);

		let chatIdForHeader: string | null = null;
		let foundUserAiChat: UserAiChatEntity | null = null;
		let isNewChat = false;

		if (ai_thread_id) {
			foundUserAiChat = await this._dbContext.userAiChatRepository.findChatByIdAndUserId(ai_thread_id, user_id);
			if (foundUserAiChat) {
				chatIdForHeader = foundUserAiChat.id;
			}
		}

		if (!foundUserAiChat) {
			foundUserAiChat = await this._dbContext.userAiChatRepository.createChatForUser(user_id);
			chatIdForHeader = foundUserAiChat.id;
			isNewChat = true;
		}

		if (chatIdForHeader) {
			response.setHeader('X-AI-Thread-ID', chatIdForHeader);
		}

		await this._dbContext.aiChatMessageRepository.saveMessage(foundUserAiChat.id, user_message, MessageRole.user);

		if (isNewChat) {
			this.generateAndUpdateChatName(foundUserAiChat.id, user_message).catch((error) => {
				Sentry.captureException(error);
			});
		}

		const messages = await this.buildMessagesWithHistory(systemPrompt, user_message, foundUserAiChat.id, isNewChat);

		try {
			const accumulatedResponse = await this.processWithToolLoop(
				messages,
				tools,
				response,
				dataAccessObject,
				tableName,
				userEmail,
				foundConnection,
				user_id,
			);

			if (accumulatedResponse) {
				await this._dbContext.aiChatMessageRepository.saveMessage(
					foundUserAiChat.id,
					accumulatedResponse,
					MessageRole.ai,
				);
			}

			response.end();
		} catch (error) {
			await slackPostMessage((error as Error)?.message);
			Sentry.captureException(error);
			if (!response.headersSent) {
				response.status(500).send({ error: 'An error occurred while processing your request.' });
			}
		}
	}

	private async processWithToolLoop(
		messages: BaseMessage[],
		tools: AIToolDefinition[],
		response: Response,
		dataAccessObject: IDataAccessObject | IDataAccessObjectAgent,
		inputTableName: string,
		userEmail: string,
		foundConnection: ConnectionEntity,
		userId: string,
	): Promise<string> {
		let currentMessages = [...messages];
		let depth = 0;
		let totalAccumulatedResponse = '';

		while (depth < this.maxDepth) {
			try {
				const stream = await this.aiCoreService.streamChatWithToolsAndProvider(this.aiProvider, currentMessages, tools);

				const pendingToolCalls: AIToolCall[] = [];
				let accumulatedContent = '';

				for await (const chunk of stream) {
					if (chunk.type === 'text' && chunk.content) {
						accumulatedContent += chunk.content;
						this.writeChunk(response, { type: 'thinking', content: chunk.content });
					}

					if (chunk.type === 'tool_call' && chunk.toolCall) {
						pendingToolCalls.push(chunk.toolCall);
					}
				}

				this.logger.log(
					`Tool loop iteration ${depth + 1}: toolCalls=${pendingToolCalls.map((tc) => tc.name).join(', ') || 'none'}, ` +
						`contentLength=${accumulatedContent.length}`,
				);

				if (pendingToolCalls.length === 0) {
					this.writeChunk(response, { type: 'thinking_commit' });
					totalAccumulatedResponse += accumulatedContent;
					break;
				}

				this.writeChunk(response, { type: 'thinking_reset' });

				for (const toolCall of pendingToolCalls) {
					this.logger.log(`Tool call: ${toolCall.name}, arguments=${JSON.stringify(toolCall.arguments)}`);
				}

				const toolResults = await this.executeToolCalls(
					pendingToolCalls,
					dataAccessObject,
					inputTableName,
					userEmail,
					foundConnection,
					userId,
				);

				for (const toolResult of toolResults) {
					this.logger.log(`Tool result for ${toolResult.toolCallId}: resultLength=${toolResult.result.length}`);
				}

				const continuationBuilder = MessageBuilder.fromMessages(currentMessages);
				continuationBuilder.ai(accumulatedContent, pendingToolCalls);
				for (const result of toolResults) {
					continuationBuilder.toolResult(result.toolCallId, result.result);
				}
				currentMessages = continuationBuilder.build();

				depth++;
			} catch (loopError) {
				this.logger.error(`Error in tool loop at depth ${depth + 1}: ${getErrorMessage(loopError)}`);
				throw loopError;
			}
		}

		if (depth >= this.maxDepth) {
			this.logger.warn(`Tool loop reached max depth (${this.maxDepth})`);
			const maxDepthMessage =
				'\n\nYour question is too complex to process at this time. Please try simplifying it or breaking it down into smaller parts.';
			this.writeChunk(response, { type: 'text', content: maxDepthMessage });
			totalAccumulatedResponse += maxDepthMessage;
		}

		return totalAccumulatedResponse;
	}

	private writeChunk(
		response: Response,
		chunk:
			| { type: 'thinking'; content: string }
			| { type: 'thinking_reset' }
			| { type: 'thinking_commit' }
			| { type: 'text'; content: string },
	): void {
		response.write(JSON.stringify(chunk) + '\n');
	}

	private async executeToolCalls(
		toolCalls: AIToolCall[],
		dataAccessObject: IDataAccessObject | IDataAccessObjectAgent,
		inputTableName: string,
		userEmail: string,
		foundConnection: ConnectionEntity,
		userId: string,
	): Promise<Array<{ toolCallId: string; result: string }>> {
		const results: Array<{ toolCallId: string; result: string }> = [];

		for (const toolCall of toolCalls) {
			let result: string;

			try {
				switch (toolCall.name) {
					case 'getTableStructure': {
						const tableName = (toolCall.arguments.tableName as string) || inputTableName;
						await this.assertUserCanReadTables([tableName], userId, foundConnection.id);
						const structureInfo = await this.getTableStructureInfo(
							dataAccessObject,
							tableName,
							userEmail,
							foundConnection,
							userId,
						);
						result = encodeToToon(structureInfo);
						break;
					}

					case 'executeRawSql': {
						const query = toolCall.arguments.query as string;
						if (!query) {
							throw new Error('Missing required function argument "query"');
						}
						if (!isValidSQLQuery(query)) {
							throw new Error(
								'Invalid SQL query. Please ensure it is a read-only SELECT statement without any forbidden keywords.',
							);
						}
						await assertUserCanReadQueryTables({
							query,
							connectionType: foundConnection.type as ConnectionTypesEnum,
							connectionId: foundConnection.id,
							validateTableRead: (referencedTableName) =>
								this.cedarPermissions.improvedCheckTableRead(userId, foundConnection.id, referencedTableName),
							listAllTableNames: async () => (await dataAccessObject.getTablesFromDB()).map((table) => table.tableName),
						});
						const wrappedQuery = wrapQueryWithLimit(query, foundConnection.type as ConnectionTypesEnum);
						const queryResult = await dataAccessObject.executeRawQuery(wrappedQuery, inputTableName, userEmail);
						result = encodeToToon(queryResult);
						break;
					}

					case 'executeAggregationPipeline': {
						const pipeline = toolCall.arguments.pipeline as string;
						if (!pipeline) {
							throw new Error('Missing required function argument "pipeline"');
						}
						if (!isValidMongoDbCommand(pipeline)) {
							throw new Error(
								'Invalid MongoDB command. Please ensure it is a read-only aggregation pipeline without any forbidden keywords.',
							);
						}
						if (!isReadOnlyMongoAggregationPipeline(pipeline)) {
							throw new Error(
								'Invalid MongoDB command. Aggregation stages that write data ($out, $merge) or execute ' +
									'server-side JavaScript ($function, $accumulator, $where) are not allowed.',
							);
						}
						await this.assertUserCanReadPipelineCollections(
							pipeline,
							inputTableName,
							userId,
							foundConnection.id,
							dataAccessObject,
						);
						const pipelineResult = await dataAccessObject.executeRawQuery(pipeline, inputTableName, userEmail);
						result = encodeToToon(pipelineResult);
						break;
					}

					case 'searchDocumentation': {
						const query = toolCall.arguments.query as string;
						if (!query) {
							throw new Error('Missing required function argument "query"');
						}
						const docsResults = await searchDocumentation(query);
						result = encodeToToon({ query, results: docsResults });
						break;
					}

					default:
						result = encodeError({ error: `Unknown tool: ${toolCall.name}` });
				}
			} catch (error) {
				const errMessage = getErrorMessage(error);
				this.logger.error(`Tool call ${toolCall.name} (${toolCall.id}) failed: ${errMessage}`);
				result = encodeError({ error: errMessage });
			}

			results.push({ toolCallId: toolCall.id, result });
		}

		return results;
	}

	private async getTableStructureInfo(
		dao: IDataAccessObject | IDataAccessObjectAgent,
		tableName: string,
		userEmail: string,
		foundConnection: ConnectionEntity,
		userId: string,
	) {
		const [tableStructure, tableForeignKeys, referencedTableNamesAndColumns] = await Promise.all([
			dao.getTableStructure(tableName, userEmail),
			dao.getTableForeignKeys(tableName, userEmail),
			dao.getReferencedTableNamesAndColumns(tableName, userEmail),
		]);

		// Only expose the structure of related tables the user is permitted to
		// read — otherwise foreign-key traversal would leak the schema of tables
		// the user has no access to.
		const referencedTablesStructures = [];
		const structurePromises = referencedTableNamesAndColumns.flatMap((referencedTable) =>
			referencedTable.referenced_by.map(async (table) => {
				const canRead = await this.cedarPermissions.improvedCheckTableRead(
					userId,
					foundConnection.id,
					table.table_name,
				);
				if (!canRead) {
					return null;
				}
				const structure = await dao.getTableStructure(table.table_name, userEmail);
				return { tableName: table.table_name, structure };
			}),
		);
		referencedTablesStructures.push(...(await Promise.all(structurePromises)).filter((item) => item !== null));

		const foreignTablesStructures = [];
		const foreignTablesStructurePromises = tableForeignKeys.map(async (foreignKey) => {
			const canRead = await this.cedarPermissions.improvedCheckTableRead(
				userId,
				foundConnection.id,
				foreignKey.referenced_table_name,
			);
			if (!canRead) {
				return null;
			}
			const structure = await dao.getTableStructure(foreignKey.referenced_table_name, userEmail);
			return { tableName: foreignKey.referenced_table_name, structure };
		});
		foreignTablesStructures.push(
			...(await Promise.all(foreignTablesStructurePromises)).filter((item) => item !== null),
		);

		return {
			tableStructure,
			tableName,
			schema: foundConnection.schema || null,
			tableForeignKeys,
			referencedTableNamesAndColumns,
			referencedTablesStructures,
			foreignTablesStructures,
		};
	}

	/**
	 * Verifies the user has read permission on every supplied table before the
	 * AI is allowed to query or inspect them. Throws a `ForbiddenException` on
	 * the first unreadable table; inside the tool loop this surfaces back to the
	 * model as a tool error, so the offending query is never executed. Empty or
	 * blank names are ignored.
	 */
	private async assertUserCanReadTables(
		tableNames: Array<string>,
		userId: string,
		connectionId: string,
	): Promise<void> {
		const uniqueTableNames = Array.from(
			new Set(tableNames.map((name) => name?.trim()).filter((name): name is string => Boolean(name))),
		);

		for (const tableName of uniqueTableNames) {
			const canRead = await this.cedarPermissions.improvedCheckTableRead(userId, connectionId, tableName);
			if (!canRead) {
				this.logger.warn(
					`AI request blocked for user ${userId} on connection ${connectionId}: ` +
						`no read permission for table "${tableName}"`,
				);
				throw new ForbiddenException(Messages.NO_READ_PERMISSION_FOR_TABLE(tableName));
			}
		}
	}

	/**
	 * Guards a MongoDB aggregation pipeline against table-level read permissions:
	 * the user must be able to read the base collection and every collection the
	 * pipeline pulls in (`$lookup` / `$graphLookup` / `$unionWith`). When the
	 * pipeline cannot be parsed we cannot trust it to be harmless, so we fall
	 * back to requiring read permission on every collection in the connection.
	 */
	private async assertUserCanReadPipelineCollections(
		pipeline: string,
		baseCollection: string,
		userId: string,
		connectionId: string,
		dataAccessObject: IDataAccessObject | IDataAccessObjectAgent,
	): Promise<void> {
		const collected = collectMongoPipelineCollections(pipeline);

		let collectionsToCheck: Array<string>;
		if (collected.kind === 'tables') {
			collectionsToCheck = [baseCollection, ...collected.tables];
		} else {
			this.logger.warn(
				`AI pipeline permission check could not resolve referenced collections for connection ${connectionId} ` +
					`(reason: ${collected.reason}); falling back to all-collections read check.`,
			);
			collectionsToCheck = (await dataAccessObject.getTablesFromDB()).map((table) => table.tableName);
		}

		await this.assertUserCanReadTables(collectionsToCheck, userId, connectionId);
	}

	private setupResponseHeaders(response: Response): void {
		response.setHeader('Content-Type', 'text/event-stream');
		response.setHeader('Cache-Control', 'no-cache');
		response.setHeader('Connection', 'keep-alive');
		response.setHeader('Access-Control-Expose-Headers', 'X-AI-Thread-ID');
	}

	private async setupConnection(connectionId: string, master_password: string, user_id: string) {
		const foundConnection = await this._dbContext.connectionRepository.findAndDecryptConnection(
			connectionId,
			master_password,
		);

		if (!foundConnection) {
			throw new NotFoundException(Messages.CONNECTION_NOT_FOUND);
		}

		let userEmail = '';
		if (isConnectionTypeAgent(foundConnection.type)) {
			userEmail = (await this._dbContext.userRepository.getUserEmailOrReturnNull(user_id)) ?? '';
		}

		const connectionProperties =
			await this._dbContext.connectionPropertiesRepository.findConnectionProperties(connectionId);

		if (connectionProperties && !connectionProperties.allow_ai_requests) {
			throw new BadRequestException(Messages.AI_REQUESTS_NOT_ALLOWED);
		}

		const dataAccessObject = getDataAccessObject(foundConnection);
		const databaseType = foundConnection.type;
		const isMongoDb =
			databaseType === ConnectionTypesEnum.mongodb || databaseType === ConnectionTypesEnum.agent_mongodb;

		return { foundConnection, dataAccessObject, databaseType, isMongoDb, userEmail };
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

		const previousMessages = await this._dbContext.aiChatMessageRepository.findMessagesForChat(chatId);
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

	private async generateAndUpdateChatName(chatId: string, userMessage: string): Promise<void> {
		try {
			const CHAT_NAME_GENERATION_PROMPT = `Generate a very short, concise title (max 5-6 words) for a chat conversation based on the user's first question.
The title should capture the main topic or intent.
Respond ONLY with the title, no quotes, no explanation.
User question: `;
			const prompt = CHAT_NAME_GENERATION_PROMPT + userMessage;
			const messages = new MessageBuilder().human(prompt).build();

			let generatedName = '';
			const stream = await this.aiCoreService.streamChatWithToolsAndProvider(this.aiProvider, messages, []);

			for await (const chunk of stream) {
				if (chunk.type === 'text' && chunk.content) {
					generatedName += chunk.content;
				}
			}

			generatedName = generatedName.trim().slice(0, 100);

			if (generatedName) {
				await this._dbContext.userAiChatRepository.updateChatName(chatId, generatedName);
			}
		} catch (error) {
			Sentry.captureException(error);
		}
	}
}
