import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { getDataAccessObject } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/create-data-access-object.js';
import { ConnectionTypesEnum } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/enums/connection-types-enum.js';
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

declare module 'express-session' {
  interface Session {
    lastResponseId?: string | null;
  }
}

@Injectable()
export class RequestInfoFromTableWithAIUseCaseV3
  extends AbstractUseCase<RequestInfoFromTableDSV2, void>
  implements IRequestInfoFromTableV2
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }

  public async implementation(inputData: RequestInfoFromTableDSV2): Promise<void> {
    const openApiKey = getRequiredEnvVariable('OPENAI_API_KEY');
    const openai = new OpenAI({ apiKey: openApiKey });
    const { connectionId, tableName, user_message, master_password, user_id, response } = inputData;

    this.initializeSession(response);

    const { foundConnection, dao, databaseType, isMongoDb, userEmail } = await this.setupConnection(
      connectionId,
      master_password,
      user_id,
    );

    this.setupResponseHeaders(response);

    const tools = getOpenAiTools(isMongoDb);
    let heartbeatInterval: NodeJS.Timeout | null = null;

    try {
      response.write(`data: Analyzing your request about the "${tableName}" table...\n\n`);
      heartbeatInterval = this.setupHeartbeat(response);

      const system_prompt = this.createSystemPrompt(tableName, databaseType, foundConnection);

      try {
        const stream = await this.createOpenAIStream(openai, user_message, system_prompt, user_id, tools, response);

        await this.processStream(stream, response, dao, tableName, userEmail, foundConnection, isMongoDb, user_message);
      } catch (streamError) {
        this.handleStreamError(streamError, response);
      }

      this.cleanupAndEnd(heartbeatInterval, response);
    } catch (error) {
      this.handleError(response, error, 'AI request processing');
      this.cleanupAndEnd(heartbeatInterval, response);
    }
  }

  private initializeSession(response: any): void {
    if (!response.req.session) {
      (response.req as any).session = {
        lastResponseId: null,
      };
    } else if (response.req.session.lastResponseId === undefined) {
      response.req.session.lastResponseId = null;
    }
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

    const dao = getDataAccessObject(foundConnection);
    const databaseType = foundConnection.type;
    const isMongoDb = databaseType === ConnectionTypesEnum.mongodb;

    return { foundConnection, dao, databaseType, isMongoDb, userEmail };
  }

  private setupResponseHeaders(response: any): void {
    response.setHeader('Content-Type', 'text/event-stream');
    response.setHeader('Cache-Control', 'no-cache');
    response.setHeader('Connection', 'keep-alive');
  }

  private setupHeartbeat(response: any): NodeJS.Timeout {
    const interval = setInterval(() => {
      try {
        response.write(`:heartbeat\n\n`);
      } catch (err) {
        console.error('Error sending heartbeat:', err);
        clearInterval(interval);
      }
    }, 5000);
    return interval;
  }

  private createSystemPrompt(tableName: string, databaseType: any, foundConnection: any): string {
    return `You are an AI assistant helping with database queries.
Database type: ${this.convertDdTypeEnumToReadableString(databaseType as ConnectionTypesEnum)}
Table name: "${tableName}".
${foundConnection.schema ? `Schema: "${foundConnection.schema}".` : ''}

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

Remember that all responses should be clear and user-friendly, explaining technical details when necessary.`;
  }

  private async createOpenAIStream(
    openai: OpenAI,
    user_message: string,
    system_prompt: string,
    user_id: string,
    tools: any[],
    response: any,
  ) {
    return await openai.responses.create({
      model: 'gpt-4.1',
      input: user_message,
      tool_choice: 'auto',
      instructions: system_prompt,
      user: user_id,
      stream: true,
      tools: tools,
      previous_response_id: response.req.session.lastResponseId || undefined,
    });
  }

  private async processStream(
    stream: any,
    response: any,
    dao: any,
    tableName: string,
    userEmail: string,
    foundConnection: any,
    isMongoDb: boolean,
    user_message: string,
  ) {
    let currentToolCall = null;
    const toolCalls = [];
    let responseId = null;
    let aiResponseBuffer = '';
    const responseIdRef = { id: null };

    for await (const chunk of stream) {
      const typedChunk = chunk as any;

      const result = this.processStreamChunk(
        typedChunk,
        response,
        aiResponseBuffer,
        currentToolCall,
        toolCalls,
        responseIdRef,
      );

      aiResponseBuffer = result.buffer;
      currentToolCall = result.currentToolCall;
      responseId = responseIdRef.id;

      if (typedChunk.type === 'response.output_item.done' && typedChunk.item?.type === 'function_call') {
        await this.handleCompletedToolCall(
          typedChunk,
          toolCalls,
          dao,
          tableName,
          userEmail,
          foundConnection,
          isMongoDb,
          response,
          user_message,
          aiResponseBuffer,
          responseId,
        );
      }
    }

    if (
      toolCalls.length === 0 ||
      !toolCalls.some(
        (tc) => tc.function?.name === 'executeRawSql' || tc.function?.name === 'executeAggregationPipeline',
      )
    ) {
      await this.detectAndExecuteSqlQueries(aiResponseBuffer, dao, tableName, userEmail, foundConnection, response);
    }

    if (aiResponseBuffer.trim() && responseId) {
      response.req.session.lastResponseId = responseId;
    }
  }

  private async handleCompletedToolCall(
    typedChunk: any,
    toolCalls: any[],
    dao: any,
    tableName: string,
    userEmail: string,
    foundConnection: any,
    isMongoDb: boolean,
    response: any,
    user_message: string,
    aiResponseBuffer: string,
    responseId: string,
  ) {
    const completedToolCall = toolCalls.find((tc) => tc.id === typedChunk.item.id);
    if (completedToolCall) {
      try {
        const toolName = completedToolCall.function.name;
        response.write(`data: ${this.getUserMessageForTool(toolName)}\n\n`);

        if (toolName === 'getTableStructure') {
          await this.handleTableStructureTool(
            dao,
            tableName,
            userEmail,
            foundConnection,
            response,
            user_message,
            aiResponseBuffer,
            responseId,
            isMongoDb,
          );
        } else if (toolName === 'executeRawSql' || toolName === 'executeAggregationPipeline') {
          await this.processQueryToolCall(
            completedToolCall,
            dao,
            tableName,
            userEmail,
            foundConnection,
            isMongoDb,
            response,
            user_message,
          );
        }
      } catch (error) {
        this.handleError(response, error, 'processing your request');
      }
    }
  }

  private async handleTableStructureTool(
    dao: any,
    tableName: string,
    userEmail: string,
    foundConnection: any,
    response: any,
    user_message: string,
    aiResponseBuffer: string,
    responseId: string,
    isMongoDb: boolean,
  ) {
    const tableStructureInfo = await this.getTableStructureInfo(dao, tableName, userEmail, foundConnection);

    response.write(`data: Fetching table structure information for ${tableName}...\n\n`);

    const updatedSystemPrompt = this.createTableStructurePrompt(tableName, foundConnection, isMongoDb);

    try {
      const enhancedMessage = this.createTableStructureMessage(user_message, tableStructureInfo);

      responseId = null;
      response.req.session.lastResponseId = null;

      const openApiKey = getRequiredEnvVariable('OPENAI_API_KEY');
      const openai = new OpenAI({ apiKey: openApiKey });
      const tools = getOpenAiTools(isMongoDb);

      const continuedStream = await openai.responses.create({
        model: 'gpt-4.1',
        input: enhancedMessage,
        tool_choice: 'auto',
        instructions: updatedSystemPrompt,
        user: user_message,
        stream: true,
        tools: tools,
      });

      await this.processSecondStream(
        continuedStream,
        response,
        dao,
        tableName,
        userEmail,
        foundConnection,
        isMongoDb,
        user_message,
        aiResponseBuffer,
      );
    } catch (innerStreamError) {
      console.error('Error creating second OpenAI stream with table structure data:', innerStreamError);
      response.write(
        `data: Sorry, I encountered a problem analyzing your table information: ${innerStreamError.message}\n\n`,
      );
    }
  }

  private createTableStructurePrompt(tableName: string, foundConnection: any, isMongoDb: boolean): string {
    const basePrompt = this.createSystemPrompt(tableName, foundConnection.type, foundConnection);
    return (
      basePrompt +
      `\n\nYou are continuing a conversation where the user asked about table data and you requested the table structure. You now have the structure and must analyze it to answer the user's question with ${isMongoDb ? 'MongoDB aggregation' : 'SQL'}.`
    );
  }

  private createTableStructureMessage(user_message: string, tableStructureInfo: any): string {
    return `I asked: "${user_message}"

You called the getTableStructure tool, and here is the result:

\`\`\`json
${JSON.stringify(tableStructureInfo, null, 2)}
\`\`\`

Now, using this table structure information:
1. Analyze the schema, relationships, and columns in the table structure above
2. Create an appropriate SQL query based on my original question
3. Call the executeRawSql tool with your generated query
4. When you get the results, explain them to me conversationally, directly answering my question

Remember: You MUST use the executeRawSql tool to run your query and show me the actual data.`;
  }

  private async processSecondStream(
    continuedStream: any,
    response: any,
    dao: any,
    tableName: string,
    userEmail: string,
    foundConnection: any,
    isMongoDb: boolean,
    user_message: string,
    originalBuffer: string,
  ) {
    const innerToolCalls = [];
    let innerCurrentToolCall = null;
    let innerResponseId = null;
    let innerAiResponseBuffer = '';
    const innerResponseIdRef = { id: null };

    response.write(`data: Analyzing your data structure and preparing an appropriate query...\n\n`);

    for await (const innerChunk of continuedStream) {
      const typedInnerChunk = innerChunk as any;

      const result = this.processStreamChunk(
        typedInnerChunk,
        response,
        innerAiResponseBuffer,
        innerCurrentToolCall,
        innerToolCalls,
        innerResponseIdRef,
      );

      innerAiResponseBuffer = result.buffer;
      innerCurrentToolCall = result.currentToolCall;
      innerResponseId = innerResponseIdRef.id;

      if (typedInnerChunk.type === 'response.output_item.done' && typedInnerChunk.item?.type === 'function_call') {
        const completedInnerToolCall = innerToolCalls.find((tc) => tc.id === typedInnerChunk.item.id);
        if (completedInnerToolCall) {
          const toolName = completedInnerToolCall.function.name;
          response.write(`data: ${this.getUserMessageForTool(toolName, true)}\n\n`);

          await this.processQueryToolCall(
            completedInnerToolCall,
            dao,
            tableName,
            userEmail,
            foundConnection,
            isMongoDb,
            response,
            user_message,
          );
        }
      }
    }

    if (
      innerToolCalls.length === 0 ||
      !innerToolCalls.some(
        (tc) => tc.function?.name === 'executeRawSql' || tc.function?.name === 'executeAggregationPipeline',
      )
    ) {
      await this.detectAndExecuteSqlQueries(
        innerAiResponseBuffer,
        dao,
        tableName,
        userEmail,
        foundConnection,
        response,
      );
    }

    this.handleBufferAndResponseId(innerAiResponseBuffer, innerResponseId, originalBuffer, response);
  }

  private handleBufferAndResponseId(
    innerBuffer: string,
    innerResponseId: string | null,
    originalBuffer: string,
    response: any,
  ) {
    if (innerBuffer.trim()) {
      if (originalBuffer) {
        if (innerResponseId) {
          response.req.session.lastResponseId = innerResponseId;
        }
      } else {
        if (innerResponseId) {
          response.req.session.lastResponseId = innerResponseId;
        }
      }
    }
  }

  private handleStreamError(streamError: any, response: any) {
    console.error('Error creating OpenAI stream:', streamError);
    response.write(`data: Sorry, I'm having trouble connecting to the AI service: ${streamError.message}\n\n`);

    if (streamError.status === 401) {
      response.write(
        `data: This may be due to insufficient API permissions. Please check your API key configuration.\n\n`,
      );
    } else if (streamError.status === 500) {
      response.write(`data: This appears to be a temporary issue with the AI service. Please try again later.\n\n`);
    }
  }

  private cleanupAndEnd(heartbeatInterval: NodeJS.Timeout | null, response: any) {
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
    }
    response.end();
  }

  private async getTableStructureInfo(dao, tableName, userEmail, foundConnection) {
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

  private isEmptyContent(content: string): boolean {
    return !content || content.trim() === '';
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
        console.error('Could not sanitize JSON, returning empty object');
        return '{}';
      }
    }
  }

  private async processQueryToolCall(
    toolCall,
    dao,
    tableName,
    userEmail,
    foundConnection,
    _isMongoDb,
    response,
    user_message: string = 'Query the database',
  ) {
    try {
      const openApiKey = getRequiredEnvVariable('OPENAI_API_KEY');
      const openai = new OpenAI({ apiKey: openApiKey });

      const user_id = response.req.session.userId || 'anonymous';

      const toolName = toolCall.function.name;
      const sanitizedArgs = this.sanitizeJsonString(toolCall.function.arguments);
      const toolArgs = JSON.parse(sanitizedArgs);

      response.write(`data: ${this.getUserMessageForTool(toolName)}\n\n`);

      if (toolName === 'executeRawSql') {
        const query = toolArgs.query;
        if (!query || typeof query !== 'string') {
          response.write(
            `data: Sorry, I couldn't understand how to query your data. Could you try rephrasing your question?\n\n`,
          );
          return;
        }
        if (!this.isValidSQLQuery(query)) {
          response.write(
            `data: Sorry, for data safety reasons I can only run read-only queries that don't modify your data.\n\n`,
          );
          return;
        }

        const finalQuery = this.wrapQueryWithLimit(query, foundConnection.type as ConnectionTypesEnum);

        try {
          const queryResult = await dao.executeRawQuery(finalQuery, tableName, userEmail);
          response.write(`data: Query executed successfully.\n\n`);
          if (
            await this.streamHumanReadableAnswer(
              query,
              queryResult,
              user_message,
              foundConnection,
              openai,
              user_id,
              response,
            )
          ) {
            console.info('Successfully streamed human-readable answer');
          } else {
            console.info('Streaming failed, using non-streaming fallback');
            const formattedResults = this.formatQueryResults(queryResult);
            const interpretation = await this.generateHumanReadableAnswer(
              query,
              queryResult,
              user_message,
              foundConnection,
              openai,
              user_id,
            );

            if (interpretation) {
              response.write(`data: ${interpretation}\n\n`);
            } else {
              response.write(`data: Results: ${formattedResults}\n\n`);
            }
          }
        } catch (error) {
          console.error('Error executing SQL query:', error);
          response.write(`data: Sorry, I couldn't retrieve the data you requested: ${error.message}\n\n`);
        }
      } else if (toolName === 'executeAggregationPipeline') {
        const pipeline = toolArgs.pipeline;
        if (!pipeline || typeof pipeline !== 'string') {
          response.write(`data: Invalid MongoDB pipeline provided.\n\n`);
          return;
        }

        if (!this.isValidMongoDbCommand(pipeline)) {
          response.write(`data: Sorry, I can only run data analysis operations that don't modify your data.\n\n`);
          console.info('MongoDB pipeline validation failed, potentially harmful:', pipeline);
          return;
        }

        try {
          console.info('Executing MongoDB pipeline:', pipeline);
          const pipelineResult = await dao.executeRawQuery(pipeline, tableName, userEmail);
          response.write(`data: Pipeline executed successfully.\n\n`);
          if (
            await this.streamHumanReadableAnswer(
              pipeline,
              pipelineResult,
              user_message,
              foundConnection,
              openai,
              user_id,
              response,
            )
          ) {
            console.info('Successfully streamed MongoDB pipeline interpretation');
          } else {
            console.info('Streaming failed for MongoDB, using non-streaming fallback');
            const formattedResults = this.formatQueryResults(pipelineResult);
            const interpretation = await this.generateHumanReadableAnswer(
              pipeline,
              pipelineResult,
              user_message,
              foundConnection,
              openai,
              user_id,
            );

            if (interpretation) {
              response.write(`data: ${interpretation}\n\n`);
            } else {
              response.write(`data: Results: ${formattedResults}\n\n`);
            }
          }
        } catch (error) {
          console.error('Error executing MongoDB pipeline:', error);
          response.write(`data: Sorry, I couldn't complete the data analysis you requested: ${error.message}\n\n`);
        }
      } else if (toolName === 'getTableStructure') {
        response.write(`data: Table structure information has been fetched.\n\n`);
      } else {
        console.info(`Unknown tool call: ${toolName}`);
        response.write(`data: Received unknown tool call: ${toolName}\n\n`);
      }
    } catch (error) {
      this.handleError(response, error, 'in processQueryToolCall');
    }
  }

  private formatQueryResults(results: any): string {
    try {
      if (!results) {
        return 'No results returned';
      }

      if (!Array.isArray(results) || results.length === 0) {
        return JSON.stringify(results, null, 2);
      }

      if (results.length <= 5) {
        return JSON.stringify(results, null, 2);
      }

      const sample = results.slice(0, 5);
      return `${JSON.stringify(sample, null, 2)}\n\n(Showing 5 of ${results.length} results)`;
    } catch (error) {
      console.error('Error formatting query results:', error);
      return JSON.stringify(results);
    }
  }

  private async detectAndExecuteSqlQueries(
    text: string,
    dao,
    tableName,
    userEmail,
    foundConnection,
    response,
  ): Promise<boolean> {
    try {
      const sqlPattern = /```(?:sql)?\s*(SELECT\s+[^;]+;?)```|`(SELECT\s+[^;]+;?)`|(SELECT\s+.*\s+FROM\s+[^;]+;?)/im;

      const match = text.match(sqlPattern);
      if (!match) return false;

      const query = (match[1] || match[2] || match[3] || '').trim();

      if (!query || query.length < 10) return false;

      response.write(`data: I notice a potential database query in your question. Let me run that for you...\n\n`);

      if (!this.isValidSQLQuery(query)) {
        response.write(
          `data: Sorry, I can't run this query as it might modify data or contains potentially unsafe operations.\n\n`,
        );
        return false;
      }

      const databaseType = foundConnection.type as ConnectionTypesEnum;
      const finalQuery = this.wrapQueryWithLimit(query, databaseType);

      try {
        const queryResult = await dao.executeRawQuery(finalQuery, tableName, userEmail);
        response.write(`data: Successfully retrieved the data you requested.\n\n`);

        const openApiKey = getRequiredEnvVariable('OPENAI_API_KEY');
        const openai = new OpenAI({ apiKey: openApiKey });
        const user_id = response.req.session.userId || 'anonymous';

        const user_message = 'Query the database';

        const interpretation = await this.generateHumanReadableAnswer(
          query,
          queryResult,
          user_message,
          foundConnection,
          openai,
          user_id,
        );

        if (interpretation) {
          response.write(`data: ${interpretation}\n\n`);
        } else {
          const formattedResults = this.formatQueryResults(queryResult);
          response.write(`data: Results: ${formattedResults}\n\n`);
        }

        return true;
      } catch (error) {
        console.error('Error auto-executing detected SQL query:', error);
        response.write(`data: Sorry, I couldn't retrieve that data for you: ${error.message}\n\n`);
        return true;
      }
    } catch (error) {
      console.error('Error in detectAndExecuteSqlQueries:', error);
      return false;
    }
  }

  private async generateHumanReadableAnswer(
    query: string,
    queryResult: any,
    originalQuestion: string,
    connection: any,
    openai: OpenAI,
    userId: string,
  ): Promise<string | null> {
    try {
      console.log('Generating human-readable answer for query results using responses API');

      const simplifiedResults = this.simplifyQueryResults(queryResult);

      const instructions = `You are a helpful assistant that explains database query results in simple, human-readable terms.
Your task is to analyze the query results and provide a clear, conversational explanation.
Focus directly on answering the user's original question in a friendly tone.
Mention the number of records found if relevant and summarize key insights.
Do not mention SQL syntax or technical implementation details unless specifically asked.
Keep your response concise and easy to understand.`;

      const inputPrompt = `
I need you to explain these database query results in simple terms:

Original question: "${originalQuestion}"

Database type: ${this.convertDdTypeEnumToReadableString(connection.type as ConnectionTypesEnum)}
Query executed: ${query}

Query results: ${JSON.stringify(simplifiedResults, null, 2)}

Please provide a clear, concise, and conversational answer that directly addresses my original question.
`;

      try {
        const response = await openai.responses.create({
          model: 'gpt-4',
          input: inputPrompt,
          instructions: instructions,
          user: userId,
          stream: false,
        });

        let humanReadableAnswer = '';

        if (response && response.output) {
          const outputItems = response.output as Array<any>;

          for (const item of outputItems) {
            if (item.text && typeof item.text === 'string') {
              humanReadableAnswer += item.text;
            } else if (item.content && typeof item.content === 'string') {
              humanReadableAnswer += item.content;
            }
          }
        }

        if (humanReadableAnswer.trim()) {
          console.log('Human-readable answer generated successfully with responses API');
          return humanReadableAnswer;
        } else {
          console.log('No content returned from responses API, falling back to completions');
        }
      } catch (responsesError) {
        console.error('Error using responses API:', responsesError);
        if (responsesError instanceof Error) {
          console.error('Responses API error details:', responsesError.message);
          console.error('Responses API error stack:', responsesError.stack);
        }
      }
      try {
        const completion = await openai.chat.completions.create({
          model: 'gpt-4',
          messages: [
            { role: 'system', content: instructions },
            { role: 'user', content: inputPrompt },
          ],
          temperature: 0.7,
          max_tokens: 500,
          user: userId,
        });
        if (completion.choices && completion.choices.length > 0) {
          const humanReadableAnswer = completion.choices[0].message.content;
          return humanReadableAnswer;
        } else {
          return `Based on the query results, there are ${this.extractResultCount(queryResult)} records matching your criteria.`;
        }
      } catch (completionsError) {
        console.error('Error using completions API as fallback:', completionsError);

        const rowCount = this.extractResultCount(queryResult);
        let fallbackMessage = `I found ${rowCount} records in the database`;

        if (rowCount === 1) {
          fallbackMessage += `. Here is the result: ${JSON.stringify(this.getFirstResult(queryResult), null, 2)}`;
        } else if (rowCount > 1) {
          fallbackMessage += `. Here's a sample of the results: ${JSON.stringify(this.getSampleResults(queryResult), null, 2)}`;
        } else {
          fallbackMessage += `, but could not generate a detailed explanation due to a technical issue.`;
        }

        return fallbackMessage;
      }
    } catch (error) {
      console.error('Error generating human-readable answer:', error);
      return `There are ${this.extractResultCount(queryResult)} records in the results.`;
    }
  }

  private getFirstResult(results: any): any {
    try {
      if (!results) return null;

      if (results.rows && results.rows.length > 0) {
        return results.rows[0];
      }

      if (Array.isArray(results) && results.length > 0) {
        return results[0];
      }

      return results;
    } catch (error) {
      console.error('Error getting first result:', error);
      return null;
    }
  }

  private getSampleResults(results: any): any {
    try {
      if (!results) return [];

      if (results.rows && results.rows.length > 0) {
        return results.rows.slice(0, 3);
      }

      if (Array.isArray(results) && results.length > 0) {
        return results.slice(0, 3);
      }

      return [results];
    } catch (error) {
      console.error('Error getting sample results:', error);
      return [];
    }
  }

  private async streamHumanReadableAnswer(
    query: string,
    queryResult: any,
    originalQuestion: string,
    connection: any,
    openai: OpenAI,
    userId: string,
    response: any,
  ): Promise<boolean> {
    try {
      console.log('Streaming human-readable answer for query results using responses API');
      this.writeToResponse(response, 'Creating an explanation of what your data shows...');

      const simplifiedResults = this.simplifyQueryResults(queryResult);
      const instructions = this.getExplanationInstructions();
      const inputPrompt = this.createExplanationPrompt(originalQuestion, connection, query, simplifiedResults);

      try {
        const stream = await openai.responses.create({
          model: 'gpt-4',
          input: inputPrompt,
          instructions: instructions,
          user: userId,
          stream: true,
          previous_response_id: response.req.session.lastResponseId || undefined,
        });

        return await this.processExplanationStream(stream, response);
      } catch (streamingError) {
        console.error('Error streaming responses API interpretation:', streamingError);
        if (streamingError instanceof Error) {
          console.error('Error details:', streamingError.message);
        }
        return false;
      }
    } catch (error) {
      console.error('Error in streamHumanReadableAnswer:', error);
      return false;
    }
  }

  private getExplanationInstructions(): string {
    return `You are a helpful assistant that explains database query results in simple, human-readable terms.
Your task is to analyze the query results and provide a clear, conversational explanation.
Focus directly on answering the user's original question in a friendly tone.
Mention the number of records found if relevant and summarize key insights.
Do not mention SQL syntax or technical implementation details unless specifically asked.
Keep your response concise and easy to understand.`;
  }

  private createExplanationPrompt(originalQuestion: string, connection: any, query: string, results: any): string {
    return `
I need you to explain these database query results in simple terms:

Original question: "${originalQuestion}"

Database type: ${this.convertDdTypeEnumToReadableString(connection.type as ConnectionTypesEnum)}
Query executed: ${query}

Query results: ${JSON.stringify(results, null, 2)}

Please provide a clear, concise, and conversational answer that directly addresses my original question.
`;
  }

  private async processExplanationStream(stream: any, response: any): Promise<boolean> {
    type StreamChunk = {
      type: string;
      delta?: string;
      item?: {
        id?: string;
        type?: string;
        text?: string;
        content?: string;
      };
      text?: string;
      content?: string;
      part?: {
        text?: string;
        content?: string;
      };
      content_part?: {
        added?: string;
      };
      output?: any;
      response?: {
        id?: string;
        output?: Array<{
          type: string;
          text?: string;
        }>;
        done?: boolean;
        completed?: boolean;
        status?: string;
      };
    };

    let hasReceivedContent = false;
    let seenFullContent = false;
    const processedChunkIds = new Set();
    let responseId = null;

    for await (const chunk of stream) {
      const typedChunk = chunk as unknown as StreamChunk;

      if (this.captureResponseId(typedChunk, responseId)) {
        responseId = typedChunk.response.id;
      }

      if (this.shouldSkipChunk(typedChunk, processedChunkIds, seenFullContent)) {
        continue;
      }

      const contentLength = this.getContentLength(typedChunk);
      if (hasReceivedContent && contentLength > 50) {
        seenFullContent = true;
        continue;
      }

      const extractedContent = this.extractContentFromExplanationChunk(typedChunk);
      if (extractedContent) {
        hasReceivedContent = true;
        this.writeToResponse(response, this.safeStringify(extractedContent));
      }

      if (typedChunk.type === 'response.created' || typedChunk.type === 'response.in_progress') {
        response.write(`:heartbeat\n\n`);
      }
    }

    if (hasReceivedContent) {
      this.writeToResponse(response, '[END]');

      if (responseId) {
        response.req.session.lastResponseId = responseId;
      }

      return true;
    }

    return false;
  }

  private captureResponseId(chunk: any, _currentId: string): boolean {
    return (chunk.type === 'response.created' || chunk.type === 'response.completed') && chunk.response?.id;
  }

  private shouldSkipChunk(chunk: any, processedIds: Set<any>, fullContentSeen: boolean): boolean {
    if (chunk.item?.id && processedIds.has(chunk.item.id)) {
      return true;
    }

    if (chunk.item?.id) {
      processedIds.add(chunk.item.id);
    }

    if (
      chunk.type === 'response.output.complete' ||
      chunk.type === 'response.completed' ||
      chunk.type === 'response.message.delta' ||
      chunk.type === 'response.message.completed' ||
      chunk.type === 'response.output.done'
    ) {
      return true;
    }

    if (fullContentSeen && chunk.type !== 'response.created' && chunk.type !== 'response.in_progress') {
      return true;
    }

    return false;
  }

  private extractContentFromExplanationChunk(chunk: any): string {
    if (chunk.delta && typeof chunk.delta === 'string') {
      return chunk.delta;
    } else if (chunk.item?.text) {
      return chunk.item.text;
    } else if (chunk.item?.content) {
      return chunk.item.content;
    } else if (chunk.text) {
      return chunk.text;
    } else if (chunk.content) {
      return chunk.content;
    } else if (chunk.part?.text) {
      return chunk.part.text;
    } else if (chunk.part?.content) {
      return chunk.part.content;
    } else if (chunk.content_part?.added) {
      return chunk.content_part.added;
    }

    return null;
  }

  private simplifyQueryResults(results: any): any {
    try {
      if (!results) {
        return { type: 'empty', message: 'No results returned' };
      }

      if (results.error || (typeof results === 'object' && 'error' in results)) {
        return {
          type: 'error',
          message: typeof results.error === 'string' ? results.error : 'An error occurred in the query',
          details: results.error || results,
        };
      }

      if (results.rows && Array.isArray(results.rows)) {
        const rowCount = typeof results.rowCount === 'number' ? results.rowCount : results.rows.length;

        const simplifiedResult = {
          type: 'rowset',
          count: rowCount,
          totalRows: results.rows.length,
          hasMoreRows: rowCount > 10,
          sample: [],
        };

        try {
          if (results.fields && Array.isArray(results.fields)) {
            simplifiedResult['fields'] = results.fields.map((f) => f.name || f);
          }

          if (results.rows.length > 0) {
            const sampleRows = results.rows.slice(0, 10);

            simplifiedResult.sample = JSON.parse(JSON.stringify(sampleRows));
          }
        } catch (innerError) {
          console.error('Error processing row data:', innerError);
          simplifiedResult['sample'] = results.rows.slice(0, 10).map((row) =>
            Object.keys(row).reduce((acc, key) => {
              // eslint-disable-next-line security/detect-object-injection
              acc[key] = String(row[key] !== null ? row[key] : 'null');
              return acc;
            }, {}),
          );
        }

        return simplifiedResult;
      }

      if (Array.isArray(results)) {
        try {
          return {
            type: 'array',
            count: results.length,
            totalItems: results.length,
            hasMoreItems: results.length > 10,
            sample: JSON.parse(JSON.stringify(results.slice(0, 10))),
          };
        } catch (jsonError) {
          console.error('Error stringifying array results:', jsonError);
          return {
            type: 'array',
            count: results.length,
            totalItems: results.length,
            hasMoreItems: results.length > 10,
            sample: results.slice(0, 10).map((item) => {
              try {
                if (typeof item === 'object') {
                  return Object.keys(item).reduce((acc, key) => {
                    // eslint-disable-next-line security/detect-object-injection
                    acc[key] = String(item[key] !== null ? item[key] : 'null');
                    return acc;
                  }, {});
                } else {
                  return String(item);
                }
              } catch (_e) {
                return '[Complex Object]';
              }
            }),
          };
        }
      }

      if (results.fields) {
        const simplifiedResult = {
          type: 'fieldset',
          count: results.rowCount || (results.rows ? results.rows.length : 0),
          fields: [],
          sample: [],
        };

        try {
          if (Array.isArray(results.fields)) {
            simplifiedResult.fields = results.fields.map((f) => f.name || f);
          }

          if (results.rows && results.rows.length > 0) {
            simplifiedResult.sample = JSON.parse(JSON.stringify(results.rows.slice(0, 10)));
          }
        } catch (jsonError) {
          console.error('Error processing fieldset data:', jsonError);
          if (Array.isArray(results.fields)) {
            simplifiedResult.fields = results.fields.map((f) => String(f.name || f));
          }

          if (results.rows && results.rows.length > 0) {
            simplifiedResult.sample = [{ error: 'Could not convert row data to JSON' }];
          }
        }

        return simplifiedResult;
      }

      if (results.cursor || results.toArray || results.forEach) {
        return {
          type: 'mongodb_cursor',
          message: 'MongoDB cursor results (simplified)',
          data:
            typeof results.toArray === 'function'
              ? '[MongoDB Cursor: use .toArray() to retrieve results]'
              : '[MongoDB Result Object]',
        };
      }

      try {
        return JSON.parse(
          JSON.stringify({
            type: 'object',
            data: results,
          }),
        );
      } catch (finalError) {
        console.error('Error serializing results:', finalError);
        return {
          type: 'unserializable',
          message: 'Results could not be serialized to JSON',
          originalType: typeof results,
        };
      }
    } catch (error) {
      console.error('Error simplifying query results:', error);
      return {
        type: 'error',
        message: 'Could not simplify results',
        originalType: typeof results,
      };
    }
  }

  private extractResultCount(results: any): number {
    try {
      if (!results) return 0;

      if (results.rows && results.rows.length > 0) {
        const firstRow = results.rows[0];
        const countKeys = Object.keys(firstRow).filter(
          (k) => k.toLowerCase().includes('count') || k.toLowerCase() === 'total' || k.toLowerCase() === 'num',
        );

        if (countKeys.length > 0) {
          const count = firstRow[countKeys[0]];
          return parseInt(count, 10) || results.rows.length;
        }
        return results.rows.length;
      }

      if (Array.isArray(results)) {
        return results.length;
      }

      if (results.rowCount !== undefined) {
        return results.rowCount;
      }

      return 0;
    } catch (error) {
      console.error('Error extracting result count:', error);
      return 0;
    }
  }

  private safeStringify(value: any): string {
    if (value === null || value === undefined) {
      return '';
    }

    if (typeof value === 'string') {
      return value;
    }

    if (typeof value === 'object') {
      try {
        return JSON.stringify(value);
      } catch (error) {
        console.error('Error stringifying object:', error);
        return '[Complex Object]';
      }
    }

    return String(value);
  }

  private getContentLength(chunk: any): number {
    try {
      const contentParts = [
        chunk.delta,
        chunk.item?.text,
        chunk.item?.content,
        chunk.text,
        chunk.content,
        chunk.part?.text,
        chunk.part?.content,
        chunk.content_part?.added,
      ];

      let totalLength = 0;

      for (const part of contentParts) {
        if (typeof part === 'string') {
          totalLength += part.length;
        } else if (part && typeof part === 'object') {
          try {
            totalLength += JSON.stringify(part).length;
          } catch (_e) {
            // Ignore error
          }
        }
      }

      return totalLength;
    } catch (error) {
      console.error('Error calculating content length:', error);
      return 0;
    }
  }

  private processStreamTextChunk(chunk: any, response: any, buffer: string): string {
    if (this.isCompletionChunk(chunk)) {
      return buffer;
    }

    const extractedText = this.extractTextFromChunk(chunk);
    if (extractedText && !this.isEmptyContent(extractedText)) {
      response.write(`data: ${extractedText}\n\n`);
      return buffer + extractedText;
    }

    return buffer;
  }

  private isCompletionChunk(chunk: any): boolean {
    return (
      chunk.type === 'response.completed' ||
      chunk.type === 'response.output_text.done' ||
      chunk.type === 'response.content_part.done'
    );
  }

  private extractTextFromChunk(chunk: any): string {
    if (chunk.type === 'response.text.delta' && chunk.delta) {
      return chunk.delta;
    } else if (chunk.type === 'response.output_item.added' && chunk.item?.type === 'text' && chunk.item?.text) {
      return chunk.item.text;
    } else if (chunk.text) {
      return chunk.text;
    } else if (chunk.type === 'response.content.delta' && chunk.delta) {
      return chunk.delta;
    } else if (chunk.type === 'response.output_text.delta' && chunk.delta) {
      return chunk.delta;
    } else if (chunk.type === 'response.content_part.added') {
      if (chunk.part?.text) {
        return chunk.part.text;
      } else if (chunk.content_part?.added) {
        return chunk.content_part.added;
      }
    } else if (chunk.type === 'response.message.delta' && chunk.delta) {
      return chunk.delta;
    }
    return '';
  }

  private processToolCall(currentToolCall, toolCalls, typedChunk) {
    if (typedChunk.type === 'response.function_call_arguments.delta' && typedChunk.delta && typedChunk.item_id) {
      try {
        if (!currentToolCall) {
          const outputItem = toolCalls.find((tc) => tc.id === typedChunk.item_id);
          if (outputItem) {
            currentToolCall = outputItem;
          }
        }

        if (currentToolCall && currentToolCall.id === typedChunk.item_id) {
          if (!currentToolCall.function.arguments) {
            currentToolCall.function.arguments = '';
          }
          currentToolCall.function.arguments += typedChunk.delta;
        }
      } catch (error) {
        console.error('Error processing function call arguments delta:', error);
      }
      return currentToolCall;
    }

    if (typedChunk.type === 'response.output_item.added' && typedChunk.item?.type === 'function_call') {
      currentToolCall = {
        id: typedChunk.item.id,
        index: typedChunk.output_index || 0,
        type: 'function',
        function: {
          name: typedChunk.item.name || '',
          arguments: typedChunk.item.arguments || '',
        },
      };
      toolCalls.push(currentToolCall);
      return currentToolCall;
    }

    if (typedChunk.type === 'response.function_call_arguments.done' && typedChunk.item_id && typedChunk.arguments) {
      const relevantToolCall = toolCalls.find((tc) => tc.id === typedChunk.item_id);
      if (relevantToolCall) {
        relevantToolCall.function.arguments = typedChunk.arguments;
      }
    }

    return currentToolCall;
  }

  private getUserMessageForTool(toolName: string, isSecondQuery: boolean = false): string {
    if (toolName === 'executeRawSql') {
      return isSecondQuery ? 'Running database query with your table information...' : 'Running your database query...';
    } else if (toolName === 'executeAggregationPipeline') {
      return isSecondQuery
        ? 'Analyzing your data with the provided filters...'
        : 'Analyzing your data with the requested filters...';
    } else if (toolName === 'getTableStructure') {
      return 'Examining database table structure...';
    } else {
      return 'Processing your request...';
    }
  }

  private handleError(response: any, error: any, context: string = 'processing your request'): void {
    console.error(`Error ${context}:`, error);
    const userMessage = this.getUserFriendlyErrorMessage(error, context);
    this.writeToResponse(response, userMessage);
  }

  private getUserFriendlyErrorMessage(error: any, context: string = 'processing your data'): string {
    let message = `Sorry, I encountered an issue while ${context}.`;

    if (error.message.includes('syntax error')) {
      message = 'I had trouble understanding the database structure. Could you rephrase your question?';
    } else if (error.message.includes('permission denied')) {
      message = "I don't have permission to access that information in the database.";
    } else if (error.message.includes('no such table')) {
      message = "I couldn't find that table in the database.";
    } else if (error.message.includes('connection')) {
      message = "I'm having trouble connecting to the database right now.";
    } else {
      message += ` ${error.message}`;
    }

    return message;
  }

  private formatResponseOutput(text: string): string {
    return `data: ${text}\n\n`;
  }

  private writeToResponse(response: any, text: string): void {
    response.write(this.formatResponseOutput(text));
  }

  private processStreamChunk(
    typedChunk: any,
    response: any,
    buffer: string,
    currentToolCall: any,
    toolCalls: any[],
    responseIdRef: { id: string | null },
  ): { buffer: string; currentToolCall: any } {
    const updatedBuffer = this.processStreamTextChunk(typedChunk, response, buffer);

    if (typedChunk.type === 'response.created' || typedChunk.type === 'response.in_progress') {
      response.write(`:heartbeat\n\n`);
      if (typedChunk.type === 'response.created' && typedChunk.response?.id) {
        responseIdRef.id = typedChunk.response.id;
      }
    }

    if (typedChunk.type === 'response.completed' && typedChunk.response?.id) {
      responseIdRef.id = typedChunk.response.id;
    }

    const updatedToolCall = this.processToolCall(currentToolCall, toolCalls, typedChunk);

    return { buffer: updatedBuffer, currentToolCall: updatedToolCall };
  }
}
