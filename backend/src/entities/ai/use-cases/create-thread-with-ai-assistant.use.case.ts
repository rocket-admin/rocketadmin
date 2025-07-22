import { BadRequestException, Inject, Injectable, NotFoundException, Scope } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { ICreateThreadWithAIAssistant } from '../ai-use-cases.interface.js';
import { CreateThreadWithAssistantDS } from '../application/data-structures/create-thread-with-assistant.ds.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { getDataAccessObject } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/create-data-access-object.js';
import { TableStructureDS } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/data-structures/table-structure.ds.js';
import { getOpenAiClient } from '../utils/get-open-ai-client.js';
import { Readable } from 'stream';
import { Uploadable } from 'openai/uploads.js';
import { Blob } from 'fetch-blob';
import { File } from 'fetch-blob/file.js';
import { buildUserAiThreadEntity } from '../utils/build-ai-user-thread-entity.util.js';
import { buildUserAiFileEntity } from '../utils/build-ai-user-file-entity.util.js';
import { AiStreamsRunner } from './use-cases-utils/ai-stream-runner.js';
import { ConnectionTypesEnum } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/enums/connection-types-enum.js';
import { generateMongoDbCommandPrompt, generateSqlQueryPrompt } from '../utils/prompt-generating.util.js';

@Injectable({ scope: Scope.REQUEST })
export class CreateThreadWithAIAssistantUseCase
  extends AbstractUseCase<CreateThreadWithAssistantDS, void>
  implements ICreateThreadWithAIAssistant
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }

  public async implementation(inputData: CreateThreadWithAssistantDS): Promise<void> {
    const { connectionId, tableName, master_password, user_id, user_message, response } = inputData;

    const foundConnection = await this._dbContext.connectionRepository.findAndDecryptConnection(
      connectionId,
      master_password,
    );

    if (!foundConnection) {
      throw new NotFoundException(Messages.CONNECTION_NOT_FOUND);
    }
    const isMongoDB = foundConnection.type === ConnectionTypesEnum.mongodb;

    const foundUser = await this._dbContext.userRepository.findOneUserById(user_id);
    const userEmail = foundUser.email;

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

    const foreignTablesStructures: { tableName: string; structure: TableStructureDS[] }[] = [];

    const foreignTablesStructurePromises = tableForeignKeys.flatMap((foreignKey) =>
      dao.getTableStructure(foreignKey.referenced_table_name, userEmail).then((structure) => ({
        tableName: foreignKey.referenced_table_name,
        structure,
      })),
    );

    const resolvedForeignTablesStructures = await Promise.all(foreignTablesStructurePromises);
    foreignTablesStructures.push(...resolvedForeignTablesStructures);

    const allTablesStructuresData = JSON.stringify({
      tableName,
      structure: tableStructure,
      referencedTablesStructures,
      foreignTablesStructures,
    });

    const { openai, assistantId } = getOpenAiClient();

    const readableStream = new Readable();
    readableStream.push(allTablesStructuresData);
    readableStream.push(null);

    const blob = new Blob([allTablesStructuresData], { type: 'application/jsonl' });

    const fileLike: Uploadable = new File([blob], 'data.json', {
      lastModified: Date.now(),
      type: 'application/jsonl',
    });

    const uploadedFile = await openai.files.create({
      file: fileLike,
      purpose: 'assistants',
    });

    const thread = await openai.beta.threads.create({
      tool_resources: {
        code_interpreter: { file_ids: [uploadedFile.id] },
      },
    });

    await openai.beta.threads.messages.create(thread.id, {
      role: 'user',
      content: user_message,
    });

    const newThread = buildUserAiThreadEntity(thread.id);
    const savedThread = await this._dbContext.aiUserThreadsRepository.save(newThread);
    savedThread.user = foundUser;
    const newUploadedFile = buildUserAiFileEntity(uploadedFile.id);
    const savedFile = await this._dbContext.aiUserFilesRepository.save(newUploadedFile);
    savedThread.thread_file = savedFile;
    await this._dbContext.aiUserThreadsRepository.save(savedThread);

    const streamRunner: AiStreamsRunner = new AiStreamsRunner(
      openai,
      assistantId,
      thread.id,
      savedThread.id,
      {
        connection: foundConnection,
        tableName,
        userEmail,
      },
      response,
    );

    const systemPrompt = isMongoDB
      ? generateMongoDbCommandPrompt(tableName, foundConnection)
      : generateSqlQueryPrompt(tableName, foundConnection);

    try {
      await streamRunner.runThread(systemPrompt);
    } catch (_error) {
      response.end(Messages.SOMETHING_WENT_WRONG_AI_THREAD);
    }

    return;
  }
}
