import { BadRequestException, Inject, Injectable, NotFoundException, Scope } from '@nestjs/common';
import { getDataAccessObject } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/create-data-access-object.js';
import OpenAI from 'openai';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { getRequiredEnvVariable } from '../../../helpers/app/get-requeired-env-variable.js';
import { isConnectionTypeAgent } from '../../../helpers/is-connection-entity-agent.js';
import { IRequestInfoFromTableV2 } from '../ai-use-cases.interface.js';
import { RequestInfoFromTableDSV2 } from '../application/data-structures/request-info-from-table.ds.js';
import { getOpenAiTools } from './use-cases-utils/get-open-ai-tools.util.js';
import Sentry from '@sentry/minimal';
import { slackPostMessage } from '../../../helpers/index.js';
import { ResponsesModel } from 'openai/resources/index.js';
import { Stream } from 'openai/core/streaming.js';
import { Response } from 'express';
import { ConnectionEntity } from '../../connection/connection.entity.js';
import { AiResponsesToUserEntity } from '../ai-data-entities/ai-reponses-to-user/ai-responses-to-user.entity.js';
import { ConnectionTypesEnum } from '@rocketadmin/shared-code/dist/src/shared/enums/connection-types-enum.js';
import { IDataAccessObjectAgent } from '@rocketadmin/shared-code/dist/src/shared/interfaces/data-access-object-agent.interface.js';
import { IDataAccessObject } from '@rocketadmin/shared-code/dist/src/shared/interfaces/data-access-object.interface.js';
@Injectable({ scope: Scope.REQUEST })
export class RequestInfoFromTableWithAIUseCaseV4
  extends AbstractUseCase<RequestInfoFromTableDSV2, void>
  implements IRequestInfoFromTableV2
{
  private readonly model: ResponsesModel = 'gpt-5';
  private readonly maxDepth: number = 5;
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }

  public async implementation(inputData: RequestInfoFromTableDSV2): Promise<void> {
    const { connectionId, tableName, user_message, master_password, user_id, response, ai_thread_id } = inputData;
    this.setupResponseHeaders(response);

    const { foundConnection, dataAccessObject, databaseType, isMongoDb, userEmail } = await this.setupConnection(
      connectionId,
      master_password,
      user_id,
    );

    const tools = getOpenAiTools(isMongoDb);

    const system_prompt = this.createSystemPrompt(tableName, databaseType, foundConnection);

    let previous_response_id: string | null = null;
    let foundUserAiResponse: AiResponsesToUserEntity | null = null;
    let threadIdForHeader: string | null = null;

    if (ai_thread_id) {
      foundUserAiResponse = await this._dbContext.aiResponsesToUserRepository.findResponseByIdAndUserId(
        ai_thread_id,
        user_id,
      );
      if (foundUserAiResponse) {
        previous_response_id = foundUserAiResponse.ai_response_id;
        threadIdForHeader = foundUserAiResponse.id;
      }
    } else {
      const newAiResponse = new AiResponsesToUserEntity();
      newAiResponse.ai_response_id = null;
      newAiResponse.user_id = user_id;
      foundUserAiResponse = await this._dbContext.aiResponsesToUserRepository.save(newAiResponse);
      previous_response_id = null;
      threadIdForHeader = foundUserAiResponse.id;
    }

    if (threadIdForHeader) {
      response.setHeader('X-OpenAI-Thread-ID', threadIdForHeader);
    }
    const initialOpenAIStream = await this.createInitialOpenAIStream(
      user_message,
      system_prompt,
      user_id,
      tools,
      previous_response_id,
    );
    const currentDepth = 0;
    try {
      const lastResponseId = await this.handleStreamRecursively(
        currentDepth,
        tools,
        user_id,
        initialOpenAIStream,
        response,
        dataAccessObject,
        tableName,
        userEmail,
        foundConnection,
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
      return;
    }
  }

  private async handleStreamRecursively(
    currentDepth: number,
    tools: OpenAI.Responses.Tool[],
    user_id: string,
    stream: Stream<OpenAI.Responses.ResponseStreamEvent>,
    response: Response,
    dataAccessObject: IDataAccessObject | IDataAccessObjectAgent,
    inputTableName: string,
    userEmail: string,
    foundConnection: ConnectionEntity,
  ): Promise<string | null> {
    if (currentDepth >= this.maxDepth) {
      response.write(
        'Your question is too complex to process at this time. Please try simplifying it or breaking it down into smaller parts.',
      );
      return null;
    }
    let current_response_id: string = null;
    for await (const chunk of stream) {
      if (chunk.type === 'response.created') {
        current_response_id = chunk.response.id;
      }
      if (chunk.type === 'response.output_item.done' && chunk.item?.type === 'function_call') {
        if (chunk.item.name === 'getTableStructure') {
          let { tableName } = JSON.parse(this.sanitizeJsonString(chunk.item.arguments));
          if (!tableName) {
            tableName = inputTableName;
          }
          let current_tool_output: Record<string, any> | string;
          try {
            current_tool_output = await this.getTableStructureInfo(
              dataAccessObject,
              tableName,
              userEmail,
              foundConnection,
            );
          } catch (error) {
            current_tool_output = error.message;
          }
          const current_tool_call_id = chunk.item.call_id;
          const current_tools_output = JSON.stringify(current_tool_output);
          const nestedStream = await this.creteNestedStream(
            user_id,
            tools,
            current_response_id,
            current_tool_call_id,
            current_tools_output,
          );
          const nestedResponseId = await this.handleStreamRecursively(
            ++currentDepth,
            tools,
            user_id,
            nestedStream,
            response,
            dataAccessObject,
            inputTableName,
            userEmail,
            foundConnection,
          );
          if (nestedResponseId) {
            current_response_id = nestedResponseId;
          }
        }

        if (chunk.item.name === 'executeRawSql') {
          const { query } = JSON.parse(this.sanitizeJsonString(chunk.item.arguments));
          let current_tool_output: Record<string, any> | string;
          try {
            if (!query) {
              throw new Error('Missing required function argument "query"');
            }
            if (!this.isValidSQLQuery(query)) {
              throw new Error(
                'Invalid SQL query. Please ensure it is a read-only SELECT statement without any forbidden keywords.',
              );
            }
            current_tool_output = await dataAccessObject.executeRawQuery(
              this.wrapQueryWithLimit(query, foundConnection.type as ConnectionTypesEnum),
              inputTableName,
              userEmail,
            );
          } catch (error) {
            current_tool_output = error.message;
          }
          const current_tool_call_id = chunk.item.call_id;
          const current_tools_output = JSON.stringify(current_tool_output);
          const nestedStream = await this.creteNestedStream(
            user_id,
            tools,
            current_response_id,
            current_tool_call_id,
            current_tools_output,
          );
          const nestedResponseId = await this.handleStreamRecursively(
            ++currentDepth,
            tools,
            user_id,
            nestedStream,
            response,
            dataAccessObject,
            inputTableName,
            userEmail,
            foundConnection,
          );
          if (nestedResponseId) {
            current_response_id = nestedResponseId;
          }
        }
        if (chunk.item.name === 'executeAggregationPipeline') {
          const { pipeline } = JSON.parse(this.sanitizeJsonString(chunk.item.arguments));
          let current_tool_output: Record<string, any> | string;
          try {
            if (!pipeline) {
              throw new Error('Missing required function argument "pipeline"');
            }
            if (!this.isValidMongoDbCommand(pipeline)) {
              throw new Error(
                'Invalid MongoDB command. Please ensure it is a read-only aggregation pipeline without any forbidden keywords.',
              );
            }
            current_tool_output = await dataAccessObject.executeRawQuery(pipeline, inputTableName, userEmail);
          } catch (error) {
            current_tool_output = error.message;
          }
          const current_tool_call_id = chunk.item.call_id;
          const current_tools_output = JSON.stringify(current_tool_output);
          const nestedStream = await this.creteNestedStream(
            user_id,
            tools,
            current_response_id,
            current_tool_call_id,
            current_tools_output,
          );
          const nestedResponseId = await this.handleStreamRecursively(
            ++currentDepth,
            tools,
            user_id,
            nestedStream,
            response,
            dataAccessObject,
            inputTableName,
            userEmail,
            foundConnection,
          );
          if (nestedResponseId) {
            current_response_id = nestedResponseId;
          }
        }
      }
      if (chunk.type === 'response.output_text.delta') {
        if (this.isEmptyContent(chunk.delta)) {
          continue;
        }
        response.write(chunk.delta);
      }
    }
    if (current_response_id) {
      return current_response_id;
    }
  }

  private async creteNestedStream(
    user_id: string,
    tools: OpenAI.Responses.Tool[],
    previousResponseId: string | null,
    tool_call_id: string | null,
    tools_output: string | null,
  ) {
    const openApiKey = getRequiredEnvVariable('OPENAI_API_KEY');
    const openai = new OpenAI({ apiKey: openApiKey });
    return await openai.responses.create({
      model: this.model,
      input: [
        {
          type: 'function_call_output',
          call_id: tool_call_id,
          output: tools_output,
        },
      ],
      tool_choice: 'auto',
      user: user_id,
      stream: true,
      tools: tools,
      previous_response_id: previousResponseId,
    });
  }

  private sanitizeJsonString(jsonStr: string): string {
    try {
      JSON.parse(jsonStr);
      return jsonStr;
    } catch (_e) {
      const startBrace = jsonStr.indexOf('{');
      if (startBrace === -1) {
        return '{}';
      }

      const endBrace = jsonStr.lastIndexOf('}');
      if (endBrace === -1 || endBrace <= startBrace) {
        return '{}';
      }

      let possibleJson = jsonStr.substring(startBrace, endBrace + 1);

      possibleJson = possibleJson.replace(/,\s*}/g, '}');
      possibleJson = possibleJson.replace(/,\s*]/g, ']');

      try {
        JSON.parse(possibleJson);
        return possibleJson;
      } catch (_parseErr) {
        Sentry.captureException(_parseErr);
        console.error('Could not sanitize JSON, returning empty object');
        return '{}';
      }
    }
  }

  private async getTableStructureInfo(dao, tableName: string, userEmail: string, foundConnection: ConnectionEntity) {
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

  private isValidSQLQuery(query: string): boolean {
    const upperCaseQuery = query.toUpperCase();
    const forbiddenKeywords = ['DROP', 'DELETE', 'ALTER', 'TRUNCATE', 'INSERT', 'UPDATE'];

    if (forbiddenKeywords.some((keyword) => upperCaseQuery.includes(keyword))) {
      return false;
    }

    const cleanedQuery = query.trim().replace(/;$/, '');

    const sqlInjectionPatterns = [/--/, /\/\*/, /\*\//];

    if (sqlInjectionPatterns.some((pattern) => pattern.test(cleanedQuery))) {
      return false;
    }

    if (cleanedQuery.split(';').length > 1) {
      return false;
    }

    const selectPattern = /^\s*SELECT\s+[\s\S]+\s+FROM\s+/i;
    if (!selectPattern.test(cleanedQuery)) {
      return false;
    }

    return true;
  }

  private isValidMongoDbCommand(command: string): boolean {
    const upperCaseCommand = command.toUpperCase();
    const forbiddenKeywords = ['DROP', 'REMOVE', 'UPDATE', 'INSERT'];

    if (forbiddenKeywords.some((keyword) => upperCaseCommand.includes(keyword))) {
      return false;
    }

    const injectionPatterns = [/\/\*/, /\*\//];

    if (injectionPatterns.some((pattern) => pattern.test(command))) {
      return false;
    }

    return true;
  }

  private isEmptyContent(_content: string): boolean {
    return false;
    // if (content === ' ') {
    //   return false;
    // }
    // return !content || content.trim() === '';
  }

  private setupResponseHeaders(response: any): void {
    response.setHeader('Content-Type', 'text/event-stream');
    response.setHeader('Cache-Control', 'no-cache');
    response.setHeader('Connection', 'keep-alive');
    response.setHeader('Access-Control-Expose-Headers', 'X-OpenAI-Thread-ID');
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
    const isMongoDb = databaseType === ConnectionTypesEnum.mongodb;

    return { foundConnection, dataAccessObject, databaseType, isMongoDb, userEmail };
  }

  private createSystemPrompt(tableName: string, databaseType: any, foundConnection: any): string {
    const currentDatetime = new Date().toISOString();
    return `You are an AI assistant helping with database queries.
Database type: ${this.convertDdTypeEnumToReadableString(databaseType as ConnectionTypesEnum)}
Table name: "${tableName}".
${foundConnection.schema ? `Schema: "${foundConnection.schema}".` : ''}
Current date and time: ${currentDatetime}

Please follow these steps EXACTLY:
1. First, always use the getTableStructure tool to analyze the table schema and understand available columns
2. If the question requires data from related tables, note their relationships
3. Generate an appropriate query that answers the user's question precisely
4. Keep queries read-only for safety (SELECT only)
5. ALWAYS call the executeRawSql or executeAggregationPipeline tool with the generated query to get the actual data
6. After receiving query results, explain them to the user in a clear, conversational way
7. Include explanations of your approach when helpful
IMPORTANT:
- You MUST execute your generated queries using the appropriate tool - this is required for every question
- After generating a SQL query, immediately call executeRawSql with that query
- For MongoDB databases, call executeAggregationPipeline with the aggregation pipeline
- The user cannot see the query results until you execute it with the appropriate tool
- Always provide your answers in a conversational, human-friendly format
- Use mermaid syntax for any diagrams or charts. Clients can render mermaid diagrams.
- Use markdown formatting for tables
Remember that all responses should be clear and user-friendly, explaining technical details when necessary.`;
  }

  private convertDdTypeEnumToReadableString(dataType: ConnectionTypesEnum): string {
    switch (dataType) {
      case ConnectionTypesEnum.postgres:
      case ConnectionTypesEnum.agent_postgres:
        return 'PostgreSQL';
      case ConnectionTypesEnum.mysql:
      case ConnectionTypesEnum.agent_mysql:
        return 'MySQL';
      case ConnectionTypesEnum.mongodb:
      case ConnectionTypesEnum.agent_mongodb:
        return 'MongoDB';
      case ConnectionTypesEnum.mssql:
      case ConnectionTypesEnum.agent_mssql:
        return 'Microsoft SQL Server';
      case ConnectionTypesEnum.oracledb:
      case ConnectionTypesEnum.agent_oracledb:
        return 'Oracle DB';
      case ConnectionTypesEnum.ibmdb2:
      case ConnectionTypesEnum.agent_ibmdb2:
        return 'IBM DB2';
      default:
        throw new Error('Unknown database type');
    }
  }

  private async createInitialOpenAIStream(
    user_message: string,
    system_prompt: string,
    user_id: string,
    tools: any[],
    previous_response_id: string | null = null,
  ) {
    const openApiKey = getRequiredEnvVariable('OPENAI_API_KEY');
    const openai = new OpenAI({ apiKey: openApiKey });
    return await openai.responses.create({
      model: this.model,
      input: user_message,
      tool_choice: 'auto',
      instructions: system_prompt,
      user: user_id,
      stream: true,
      tools: tools,
      previous_response_id: previous_response_id || undefined,
    });
  }

  private wrapQueryWithLimit(query: string, databaseType: ConnectionTypesEnum): string {
    const queryWithoutSemicolon = query.replace(/;$/, '');
    switch (databaseType) {
      case ConnectionTypesEnum.postgres:
      case ConnectionTypesEnum.agent_postgres:
      case ConnectionTypesEnum.mysql:
      case ConnectionTypesEnum.agent_mysql:
      case ConnectionTypesEnum.mssql:
      case ConnectionTypesEnum.agent_mssql:
        return `SELECT * FROM (${queryWithoutSemicolon}) AS ai_query LIMIT 1000`;
      case ConnectionTypesEnum.ibmdb2:
      case ConnectionTypesEnum.agent_ibmdb2:
        return `SELECT * FROM (${queryWithoutSemicolon}) AS ai_query FETCH FIRST 1000 ROWS ONLY`;
      case ConnectionTypesEnum.oracledb:
      case ConnectionTypesEnum.agent_oracledb:
        return `SELECT * FROM (${queryWithoutSemicolon}) WHERE ROWNUM <= 1000`;
      default:
        throw new Error('Unsupported database type');
    }
  }
}
