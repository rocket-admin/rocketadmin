import { BaseMessage } from '@langchain/core/messages';
import { BadRequestException, Inject, Injectable, Logger, NotFoundException, Scope } from '@nestjs/common';
import { getDataAccessObject } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/create-data-access-object.js';
import { ConnectionTypesEnum } from '@rocketadmin/shared-code/dist/src/shared/enums/connection-types-enum.js';
import { IDataAccessObject } from '@rocketadmin/shared-code/dist/src/shared/interfaces/data-access-object.interface.js';
import { IDataAccessObjectAgent } from '@rocketadmin/shared-code/dist/src/shared/interfaces/data-access-object-agent.interface.js';
import Sentry from '@sentry/minimal';
import { Response } from 'express';
import {
	AICoreService,
	AIProviderConfig,
	AIProviderType,
	AIToolCall,
	AIToolDefinition,
	createDatabaseQuerySystemPrompt,
	createDatabaseTools,
	encodeError,
	encodeToToon,
	isValidMongoDbCommand,
	isValidSQLQuery,
	MessageBuilder,
	wrapQueryWithLimit,
} from '../../../ai-core/index.js';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { slackPostMessage } from '../../../helpers/index.js';
import { isConnectionTypeAgent } from '../../../helpers/is-connection-entity-agent.js';
import { ConnectionEntity } from '../../connection/connection.entity.js';
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
			foundConnection.schema,
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

		const { messages, previousResponseId } = await this.buildMessagesWithHistory(
			systemPrompt,
			user_message,
			foundUserAiChat.id,
			isNewChat,
		);

		try {
			const config: AIProviderConfig = {};
			if (this.aiProvider === AIProviderType.OPENAI && previousResponseId) {
				config.previousResponseId = previousResponseId;
			}

			const { accumulatedResponse, lastResponseId } = await this.processWithToolLoop(
				messages,
				tools,
				response,
				dataAccessObject,
				tableName,
				userEmail,
				foundConnection,
				config,
			);

			if (accumulatedResponse) {
				await this._dbContext.aiChatMessageRepository.saveMessage(
					foundUserAiChat.id,
					accumulatedResponse,
					MessageRole.ai,
					lastResponseId,
				);
			}

			response.end();
		} catch (error) {
			await slackPostMessage(error?.message);
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
		config: AIProviderConfig = {},
	): Promise<{ lastResponseId: string | null; accumulatedResponse: string }> {
		let currentMessages = [...messages];
		let lastResponseId: string | null = null;
		let depth = 0;
		let totalAccumulatedResponse = '';
		let currentConfig = { ...config };

		while (depth < this.maxDepth) {
			try {
				const stream = await this.aiCoreService.streamChatWithToolsAndProvider(
					this.aiProvider,
					currentMessages,
					tools,
					currentConfig,
				);

				let pendingToolCalls: AIToolCall[] = [];
				let accumulatedContent = '';

				for await (const chunk of stream) {
					if (chunk.type === 'text' && chunk.content) {
						response.write(chunk.content);
						accumulatedContent += chunk.content;
						totalAccumulatedResponse += chunk.content;
					}

					if (chunk.type === 'tool_call' && chunk.toolCall) {
						pendingToolCalls.push(chunk.toolCall);
					}

					if (chunk.responseId) {
						lastResponseId = chunk.responseId;
					}
				}

				this.logger.log(
					`Tool loop iteration ${depth + 1}: toolCalls=${pendingToolCalls.map((tc) => tc.name).join(', ') || 'none'}, ` +
						`contentLength=${accumulatedContent.length}`,
				);

				if (pendingToolCalls.length === 0) {
					break;
				}

				for (const toolCall of pendingToolCalls) {
					this.logger.log(
						`Tool call: ${toolCall.name}, arguments=${JSON.stringify(toolCall.arguments)}`,
					);
				}

				const toolResults = await this.executeToolCalls(
					pendingToolCalls,
					dataAccessObject,
					inputTableName,
					userEmail,
					foundConnection,
				);

				for (const toolResult of toolResults) {
					this.logger.log(
						`Tool result for ${toolResult.toolCallId}: resultLength=${toolResult.result.length}`,
					);
				}

				if (this.aiProvider === AIProviderType.OPENAI && lastResponseId) {
					currentConfig = { ...currentConfig, previousResponseId: lastResponseId };
				}

				const continuationBuilder = MessageBuilder.fromMessages(currentMessages);
				continuationBuilder.ai(accumulatedContent, pendingToolCalls);
				for (const result of toolResults) {
					continuationBuilder.toolResult(result.toolCallId, result.result);
				}
				currentMessages = continuationBuilder.build();

				depth++;
			} catch (loopError) {
				this.logger.error(
					`Error in tool loop at depth ${depth + 1}: ${loopError.message}`,
				);
				throw loopError;
			}
		}

		if (depth >= this.maxDepth) {
			this.logger.warn(`Tool loop reached max depth (${this.maxDepth})`);
			const maxDepthMessage =
				'\n\nYour question is too complex to process at this time. Please try simplifying it or breaking it down into smaller parts.';
			response.write(maxDepthMessage);
			totalAccumulatedResponse += maxDepthMessage;
		}

		return { lastResponseId, accumulatedResponse: totalAccumulatedResponse };
	}

	private async executeToolCalls(
		toolCalls: AIToolCall[],
		dataAccessObject: IDataAccessObject | IDataAccessObjectAgent,
		inputTableName: string,
		userEmail: string,
		foundConnection: ConnectionEntity,
	): Promise<Array<{ toolCallId: string; result: string }>> {
		const results: Array<{ toolCallId: string; result: string }> = [];

		for (const toolCall of toolCalls) {
			let result: string;

			try {
				switch (toolCall.name) {
					case 'getTableStructure': {
						const tableName = (toolCall.arguments.tableName as string) || inputTableName;
						const structureInfo = await this.getTableStructureInfo(
							dataAccessObject,
							tableName,
							userEmail,
							foundConnection,
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
						const pipelineResult = await dataAccessObject.executeRawQuery(pipeline, inputTableName, userEmail);
						result = encodeToToon(pipelineResult);
						break;
					}

					default:
						result = encodeError({ error: `Unknown tool: ${toolCall.name}` });
				}
			} catch (error) {
				this.logger.error(
					`Tool call ${toolCall.name} (${toolCall.id}) failed: ${error.message}`,
				);
				result = encodeError({ error: error.message });
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
	) {
		const [tableStructure, tableForeignKeys, referencedTableNamesAndColumns] = await Promise.all([
			dao.getTableStructure(tableName, userEmail),
			dao.getTableForeignKeys(tableName, userEmail),
			dao.getReferencedTableNamesAndColumns(tableName, userEmail),
		]);

		const referencedTablesStructures = [];
		const structurePromises = referencedTableNamesAndColumns.flatMap((referencedTable) =>
			referencedTable.referenced_by.map((table) =>
				dao.getTableStructure(table.table_name, userEmail).then((structure) => ({
					tableName: table.table_name,
					structure,
				})),
			),
		);
		referencedTablesStructures.push(...(await Promise.all(structurePromises)));

		const foreignTablesStructures = [];
		const foreignTablesStructurePromises = tableForeignKeys.flatMap((foreignKey) =>
			dao.getTableStructure(foreignKey.referenced_table_name, userEmail).then((structure) => ({
				tableName: foreignKey.referenced_table_name,
				structure,
			})),
		);
		foreignTablesStructures.push(...(await Promise.all(foreignTablesStructurePromises)));

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

		let userEmail: string;
		if (isConnectionTypeAgent(foundConnection.type)) {
			userEmail = await this._dbContext.userRepository.getUserEmailOrReturnNull(user_id);
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
	): Promise<{ messages: BaseMessage[]; previousResponseId: string | null }> {
		if (isNewChat) {
			const messages = new MessageBuilder().system(systemPrompt).human(userMessage).build();
			return { messages, previousResponseId: null };
		}

		if (this.aiProvider === AIProviderType.OPENAI) {
			const lastAiMessage = await this._dbContext.aiChatMessageRepository.findLastAiMessageForChat(chatId);
			const previousResponseId = lastAiMessage?.response_id || null;
			const messages = new MessageBuilder().system(systemPrompt).human(userMessage).build();
			return { messages, previousResponseId };
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

		return { messages: builder.build(), previousResponseId: null };
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
