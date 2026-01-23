import { BadRequestException, Inject, Injectable, NotFoundException, Scope } from '@nestjs/common';
import { getDataAccessObject } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/create-data-access-object.js';
import { ConnectionTypesEnum } from '@rocketadmin/shared-code/dist/src/shared/enums/connection-types-enum.js';
import { IDataAccessObject } from '@rocketadmin/shared-code/dist/src/shared/interfaces/data-access-object.interface.js';
import { IDataAccessObjectAgent } from '@rocketadmin/shared-code/dist/src/shared/interfaces/data-access-object-agent.interface.js';
import Sentry from '@sentry/minimal';
import { Response } from 'express';
import { BaseMessage } from '@langchain/core/messages';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { slackPostMessage } from '../../../helpers/index.js';
import { isConnectionTypeAgent } from '../../../helpers/is-connection-entity-agent.js';
import { ConnectionEntity } from '../../connection/connection.entity.js';
import { AiResponsesToUserEntity } from '../ai-data-entities/ai-reponses-to-user/ai-responses-to-user.entity.js';
import { IRequestInfoFromTableV2 } from '../ai-use-cases.interface.js';
import { RequestInfoFromTableDSV2 } from '../application/data-structures/request-info-from-table.ds.js';
import {
	AICoreService,
	AIToolDefinition,
	AIToolCall,
	MessageBuilder,
	createDatabaseTools,
	createDatabaseQuerySystemPrompt,
	isValidSQLQuery,
	isValidMongoDbCommand,
	wrapQueryWithLimit,
} from '../../../ai-core/index.js';

@Injectable({ scope: Scope.REQUEST })
export class RequestInfoFromTableWithAIUseCaseV5
	extends AbstractUseCase<RequestInfoFromTableDSV2, void>
	implements IRequestInfoFromTableV2
{
	private readonly maxDepth: number = 10;

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

		let threadIdForHeader: string | null = null;
		let foundUserAiResponse: AiResponsesToUserEntity | null = null;
		let previousResponseId: string | null = null;

		if (ai_thread_id) {
			foundUserAiResponse = await this._dbContext.aiResponsesToUserRepository.findResponseByIdAndUserId(
				ai_thread_id,
				user_id,
			);
			if (foundUserAiResponse) {
				threadIdForHeader = foundUserAiResponse.id;
				previousResponseId = foundUserAiResponse.ai_response_id;
			}
		}

		if (!foundUserAiResponse) {
			const newAiResponse = new AiResponsesToUserEntity();
			newAiResponse.ai_response_id = null;
			newAiResponse.user_id = user_id;
			foundUserAiResponse = await this._dbContext.aiResponsesToUserRepository.save(newAiResponse);
			threadIdForHeader = foundUserAiResponse.id;
		}

		if (threadIdForHeader) {
			response.setHeader('X-AI-Thread-ID', threadIdForHeader);
		}

		const messages = new MessageBuilder().system(systemPrompt).human(user_message).build();

		try {
			const lastResponseId = await this.processWithToolLoop(
				messages,
				tools,
				response,
				dataAccessObject,
				tableName,
				userEmail,
				foundConnection,
				previousResponseId,
			);

			if (foundUserAiResponse && lastResponseId) {
				foundUserAiResponse.ai_response_id = lastResponseId;
				await this._dbContext.aiResponsesToUserRepository.save(foundUserAiResponse);
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
		previousResponseId: string | null = null,
	): Promise<string | null> {
		let currentMessages = [...messages];
		let lastResponseId: string | null = previousResponseId;
		let depth = 0;

		while (depth < this.maxDepth) {
			try {
				const config = lastResponseId ? { previousResponseId: lastResponseId } : undefined;

				const stream = await this.aiCoreService.streamChatWithTools(currentMessages, tools, config);

				let accumulatedContent = '';
				let pendingToolCalls: AIToolCall[] = [];

				for await (const chunk of stream) {
					if (chunk.type === 'text' && chunk.content) {
						response.write(chunk.content);
						accumulatedContent += chunk.content;
					}

					if (chunk.type === 'tool_call' && chunk.toolCall) {
						pendingToolCalls.push(chunk.toolCall);
					}

					if (chunk.responseId) {
						lastResponseId = chunk.responseId;
					}

					if (chunk.type === 'done') {
						// Stream complete
					}
				}

				if (pendingToolCalls.length === 0) {
					break;
				}

				const toolResults = await this.executeToolCalls(
					pendingToolCalls,
					dataAccessObject,
					inputTableName,
					userEmail,
					foundConnection,
				);

				const toolMessageBuilder = new MessageBuilder();
				for (const result of toolResults) {
					toolMessageBuilder.toolResult(result.toolCallId, result.result);
				}
				currentMessages = toolMessageBuilder.build();

				depth++;
			} catch (loopError) {
				throw loopError;
			}
		}

		if (depth >= this.maxDepth) {
			response.write(
				'\n\nYour question is too complex to process at this time. Please try simplifying it or breaking it down into smaller parts.',
			);
		}

		return lastResponseId;
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
						result = JSON.stringify(structureInfo);
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
						result = JSON.stringify(queryResult);
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
						result = JSON.stringify(pipelineResult);
						break;
					}

					default:
						result = JSON.stringify({ error: `Unknown tool: ${toolCall.name}` });
				}
			} catch (error) {
				result = JSON.stringify({ error: error.message });
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
}
