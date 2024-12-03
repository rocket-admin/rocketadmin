import { BadRequestException, Inject, Injectable, MethodNotAllowedException, NotFoundException } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IRequestInfoFromTable } from '../ai-use-cases.interface.js';
import { RequestInfoFromTableDS } from '../application/data-structures/request-info-from-table.ds.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { ResponseInfoDS } from '../application/data-structures/response-info.ds.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { getDataAccessObject } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/create-data-access-object.js';
import OpenAI from 'openai';
import { isSaaS } from '../../../helpers/app/is-saas.js';
import { ConnectionTypesEnum } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/enums/connection-types-enum.js';
import { TableStructureDS } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/data-structures/table-structure.ds.js';
import { isConnectionTypeAgent } from '../../../helpers/is-connection-entity-agent.js';

@Injectable()
export class RequestInfoFromTableWithAIUseCase
  extends AbstractUseCase<RequestInfoFromTableDS, ResponseInfoDS>
  implements IRequestInfoFromTable
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }

  public async implementation(inputData: RequestInfoFromTableDS): Promise<ResponseInfoDS> {
    if (!isSaaS()) {
      throw new MethodNotAllowedException(Messages.NOT_ALLOWED_IN_THIS_MODE);
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const { connectionId, tableName, user_message, master_password, user_id } = inputData;
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

    const [tableStructure, tableForeignKeys, referencedTableNamesAndColumns] = await Promise.all([
      dao.getTableStructure(tableName, userEmail),
      dao.getTableForeignKeys(tableName, userEmail),
      dao.getReferencedTableNamesAndColumns(tableName, userEmail),
    ]);

    const referencedTablesStructures: { tableName: string; structure: TableStructureDS[] }[] = [];

    const structurePromises = referencedTableNamesAndColumns.flatMap((referencedTable) =>
      referencedTable.referenced_by.map((table) =>
        dao.getTableStructure(table.table_name, userEmail).then((structure) => ({
          tableName: table.table_name,
          structure,
        })),
      ),
    );

    const resolvedStructures = await Promise.all(structurePromises);
    referencedTablesStructures.push(...resolvedStructures);

    const databaseType = foundConnection.type;

    let prompt: string;
    if (databaseType === ConnectionTypesEnum.mongodb) {
      prompt = this.generateMongoDbCommandPrompt(
        databaseType,
        tableStructure,
        tableName,
        foundConnection,
        user_message,
        tableForeignKeys,
        referencedTableNamesAndColumns,
        referencedTablesStructures,
      );
    } else {
      prompt = this.generateSqlQueryPrompt(
        databaseType,
        tableStructure,
        tableName,
        foundConnection,
        user_message,
        tableForeignKeys,
        referencedTableNamesAndColumns,
        referencedTablesStructures,
      );
    }

    const chatCompletion = await openai.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'gpt-4o',
    });

    const generatedResponse = chatCompletion.choices[0].message.content;
    const sqlQueryMatch = generatedResponse.match(/```sql\s*([\s\S]*?)\s*```/i);
    let generatedQuery = sqlQueryMatch ? sqlQueryMatch[1].trim() : generatedResponse.trim();

    if (databaseType === ConnectionTypesEnum.mongodb) {
      generatedQuery = this.extractAggregationPipeline(generatedQuery);
    }

    const isValidQuery =
      databaseType === ConnectionTypesEnum.mongodb
        ? this.isValidMongoDbCommand(generatedQuery)
        : this.isValidSQLQuery(generatedQuery);

    if (!isValidQuery) {
      throw new BadRequestException('Sorry, can not provide an answer to this question.');
    }

    const queryResult = await dao.executeRawQuery(generatedQuery, tableName, userEmail);

    const responsePrompt = `You are an AI assistant. The user asked: "${user_message}". 
    The SQL query was executed and the result is: ${JSON.stringify(queryResult)}. 
    Based on this result only, provide a clear and concise answer to the user's question. 
    Use the context from the previous completion with id: ${chatCompletion.id}.`;

    const finalCompletion = await openai.chat.completions.create({
      messages: [{ role: 'user', content: responsePrompt }],
      model: 'gpt-4o',
    });

    const finalAnswer = finalCompletion.choices[0].message.content;

    return { response_message: finalAnswer };
  }

  private isValidSQLQuery(query: string): boolean {
    const upperCaseQuery = query.toUpperCase();
    const forbiddenKeywords = ['DROP', 'DELETE', 'ALTER', 'TRUNCATE', 'INSERT', 'UPDATE'];

    if (forbiddenKeywords.some((keyword) => upperCaseQuery.includes(keyword))) {
      return false;
    }

    const cleanedQuery = query.trim().replace(/;$/, '');

    const sqlInjectionPatterns = [/--/, /\/\*/, /\*\//, /"/];

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

  private generateSqlQueryPrompt(
    databaseType: string,
    tableStructure: any,
    tableName: string,
    foundConnection: any,
    user_message: string,
    tableForeignKeys: any[],
    referencedTableNamesAndColumns: any[],
    referencedTablesStructures: any[],
  ): string {
    let prompt = `You are an AI assistant. The user has a question about a database table.
Database type: ${this.convertDdTypeEnumToReadableString(databaseType as any)}.
Table structure: ${JSON.stringify(tableStructure)}.
Table name: "${tableName}".
${foundConnection.schema ? `Schema: "${foundConnection.schema}".` : ''}
User question: "${user_message}".
Generate a safe and efficient SQL query to answer the user's question. Ensure the query is read-only, does not modify or remove any data from the table or database and fields are properly escaped.`;

    if (tableForeignKeys.length) {
      prompt += `\nTable ${tableName} foreign keys: ${JSON.stringify(tableForeignKeys)}.`;
    }

    if (referencedTableNamesAndColumns.length) {
      prompt += `\nReferenced tables on our table ${tableName} and their columns: ${JSON.stringify(referencedTableNamesAndColumns)}.`;
    }

    if (referencedTablesStructures.length) {
      prompt += `\nReferenced tables structures: ${JSON.stringify(referencedTablesStructures)}.`;
    }

    return prompt;
  }

  private generateMongoDbCommandPrompt(
    databaseType: string,
    tableStructure: any,
    tableName: string,
    foundConnection: any,
    user_message: string,
    tableForeignKeys: any[],
    referencedTableNamesAndColumns: any[],
    referencedTablesStructures: any[],
  ): string {
    let prompt = `You are an AI assistant. The user has a question about a database table.
Database type: ${this.convertDdTypeEnumToReadableString(databaseType as any)}.
Table structure: ${JSON.stringify(tableStructure)}.
Table name: "${tableName}".
${foundConnection.schema ? `Schema: "${foundConnection.schema}".` : ''}
User question: "${user_message}".
Generate a safe and efficient MongoDB aggregation pipeline to answer the user's question. Ensure the pipeline is read-only, does not modify or remove any data from the table or database, and fields are properly escaped. Return only the aggregation pipeline array.`;

    if (tableForeignKeys.length) {
      prompt += `\nTable ${tableName} foreign keys: ${JSON.stringify(tableForeignKeys)}.`;
    }

    if (referencedTableNamesAndColumns.length) {
      prompt += `\nReferenced tables on our table ${tableName} and their columns: ${JSON.stringify(referencedTableNamesAndColumns)}.`;
    }

    if (referencedTablesStructures.length) {
      prompt += `\nReferenced tables structures: ${JSON.stringify(referencedTablesStructures)}.`;
    }

    return prompt;
  }

  private extractAggregationPipeline(response: string): string {
    const match = response.match(/\[\s*{[\s\S]*}\s*\]/);
    return match ? match[0] : '';
  }
}
