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
    const { connectionId, tableName, user_message, master_password } = inputData;
    const foundConnection = await this._dbContext.connectionRepository.findAndDecryptConnection(
      connectionId,
      master_password,
    );

    if (!foundConnection) {
      throw new NotFoundException(Messages.CONNECTION_NOT_FOUND);
    }

    const dao = getDataAccessObject(foundConnection);
    const tableStructure = await dao.getTableStructure(tableName, undefined);
    const databaseType = foundConnection.type;

    const prompt = `You are an AI assistant. The user has a question about a database table.
Database type: ${this.convertDdTypeEnumToReadableString(databaseType as any)}.
Table structure: ${JSON.stringify(tableStructure)}.
Table name: "${tableName}".
${foundConnection.schema ? `Schema: "${foundConnection.schema}".` : ''}
User question: "${user_message}".
Generate a safe and efficient ${databaseType === ConnectionTypesEnum.mongodb ? 'MongoDB command' : 'SQL query'} to answer the user's question. Ensure the ${databaseType === ConnectionTypesEnum.mongodb ? 'command' : 'query'} is read-only and does not modify or remove any data from the table or database.`;

    const chatCompletion = await openai.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'gpt-4o',
    });

    const generatedResponse = chatCompletion.choices[0].message.content;
    const sqlQueryMatch = generatedResponse.match(/```sql\s*([\s\S]*?)\s*```/i);
    const generatedQuery = sqlQueryMatch ? sqlQueryMatch[1].trim() : generatedResponse.trim();

    const isValidQuery =
      databaseType === ConnectionTypesEnum.mongodb
        ? this.isValidMongoDbCommand(generatedQuery)
        : this.isValidSQLQuery(generatedQuery);

    if (!isValidQuery) {
      throw new BadRequestException('Sorry, can not provide an answer to this question.');
    }

    const queryResult = await dao.executeRawQuery(generatedQuery, undefined);

    const responsePrompt = `You are an AI assistant. The user asked: "${user_message}". 
    The SQL query was executed and the result is: ${JSON.stringify(queryResult)}. 
    Based on this result, provide a clear and concise answer to the user's question. 
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

    const injectionPatterns = [/\/\*/, /\*\//, /"/];

    if (injectionPatterns.some((pattern) => pattern.test(command))) {
      return false;
    }

    return true;
  }

  private convertDdTypeEnumToReadableString(dataType: ConnectionTypesEnum): string {
    switch (dataType) {
      case ConnectionTypesEnum.postgres:
        return 'PostgreSQL';
      case ConnectionTypesEnum.mysql:
        return 'MySQL';
      case ConnectionTypesEnum.mongodb:
        return 'MongoDB';
      case ConnectionTypesEnum.mssql:
        return 'Microsoft SQL Server';
      case ConnectionTypesEnum.oracledb:
        return 'Oracle DB';
      case ConnectionTypesEnum.ibmdb2:
        return 'IBM DB2';
      default:
        throw new Error('Unknown database type');
    }
  }
}
