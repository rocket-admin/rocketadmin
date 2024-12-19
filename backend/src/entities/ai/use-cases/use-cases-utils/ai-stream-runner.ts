import OpenAI from 'openai';
import { AssistantStreamEvent } from 'openai/resources/beta/assistants.js';
import { ConnectionEntity } from '../../../connection/connection.entity.js';
import { getDataAccessObject } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/create-data-access-object.js';
import { ConnectionTypesEnum } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/enums/connection-types-enum.js';
import { isValidMongoDbCommand, isValidSQLQuery } from '../../utils/command-validity-check.util.js';
import { Readable } from 'stream';
import { wrapQueryWithLimit } from '../../utils/wrap-query-with-limit.util.js';
import { Response } from 'express';

export type Events =
  | 'thread.created'
  | 'thread.run.created'
  | 'thread.run.queued'
  | 'thread.run.in_progress'
  | 'thread.run.requires_action'
  | 'thread.run.completed'
  | 'thread.run.incomplete'
  | 'thread.run.failed'
  | 'thread.run.cancelling'
  | 'thread.run.cancelled'
  | 'thread.run.expired'
  | 'thread.run.step.created'
  | 'thread.run.step.in_progress'
  | 'thread.run.step.delta'
  | 'thread.run.step.completed'
  | 'thread.run.step.failed'
  | 'thread.run.step.cancelled'
  | 'thread.run.step.expired'
  | 'thread.message.created'
  | 'thread.message.in_progress'
  | 'thread.message.delta'
  | 'thread.message.completed'
  | 'thread.message.incomplete'
  | 'error';

export type ExecutionResults = {
  [key in Events]: Readable | string;
};

export class AiStreamsRunner {
  private readonly streamEventTypesListeners: Map<Events, any> = new Map();
  private toolArgumentName: string;
  private isMongoDB: boolean;

  constructor(
    private readonly openai: OpenAI,
    private readonly assistantId: string,
    private readonly threadId: string,
    private readonly connectionParameters: { connection: ConnectionEntity; tableName: string; userEmail: string },
    private readonly response: Response | null,
  ) {
    this.initStreamEventTypesListeners();
    this.isMongoDB = this.connectionParameters.connection.type === ConnectionTypesEnum.mongodb;
    this.toolArgumentName = this.isMongoDB ? 'pipeline' : 'query';
    if (this.response) {
      this.response.setHeader('X-OpenAI-Thread-ID', this.threadId);
    }
  }

  public async runThread(additionalInstructions: string = null): Promise<void> {
    return new Promise((resolve, reject) => {
      const run = this.openai.beta.threads.runs
        .stream(this.threadId, {
          assistant_id: this.assistantId,
          additional_instructions: additionalInstructions ? additionalInstructions : undefined,
        })
        .on('event', async (event) => {
          const listener = this.streamEventTypesListeners.get(event.event);
          if (listener) {
            try {
              resolve(await listener(event, run));
            } catch (error) {
              await run.done();
              reject(error);
            } finally {
              await run.done();
            }
          }
        })
        .on('error', async (error) => {
          await run.done();
          reject(error);
        });
    });
  }

  private initStreamEventTypesListeners(): void {
    this.streamEventTypesListeners.set(
      'thread.run.requires_action',
      async (event: AssistantStreamEvent.ThreadRunRequiresAction) => await this.handleThreadRunRequiresAction(event),
    );
    this.streamEventTypesListeners.set(
      'thread.message.delta',
      async (event: AssistantStreamEvent.ThreadMessageDelta) => await this.handleThreadMessageDelta(event),
    );
    this.streamEventTypesListeners.set(
      'thread.message.completed',
      async (event: AssistantStreamEvent.ThreadMessageCompleted) => await this.handleThreadMessageCompleted(event),
    );
  }

  private async handleThreadMessageCompleted(_event: AssistantStreamEvent.ThreadMessageCompleted): Promise<void> {
    this.response.end();
  }

  private async handleThreadMessageDelta(event: AssistantStreamEvent.ThreadMessageDelta): Promise<void> {
    const value = event.data.delta.content[0]['text'].value;
    this.response.write(value);
  }

  private async handleThreadRunRequiresAction(event: AssistantStreamEvent.ThreadRunRequiresAction): Promise<void> {
    let toolCallArgumentQuery = JSON.parse(
      event.data.required_action.submit_tool_outputs.tool_calls[0].function.arguments,
    )[this.toolArgumentName];
    const runId = event.data.id;
    const toolCallId = event.data.required_action.submit_tool_outputs.tool_calls[0].id;

    const { connection, tableName, userEmail } = this.connectionParameters;
    const dao = getDataAccessObject(connection);

    const isValidQuery = this.isMongoDB
      ? isValidMongoDbCommand(toolCallArgumentQuery)
      : isValidSQLQuery(toolCallArgumentQuery);

    if (!isValidQuery) {
      this.response.end('Sorry, can not provide an answer to this question.');
      return;
    }

    if (!this.isMongoDB) {
      toolCallArgumentQuery = wrapQueryWithLimit(toolCallArgumentQuery, connection.type as ConnectionTypesEnum);
    }

    let queryResult: Array<Record<string, unknown>>;
    try {
      queryResult = await dao.executeRawQuery(toolCallArgumentQuery, tableName, userEmail);
    } catch (_) {
      this.response.end('Sorry, can not provide an answer to this question. Can not retrieve data from the database.');
      return;
    }

    const queryResultAsString = JSON.stringify(queryResult);

    return new Promise((resolve, reject) => {
      this.openai.beta.threads.runs
        .submitToolOutputsStream(this.threadId, runId, {
          tool_outputs: [
            {
              tool_call_id: toolCallId,
              output: queryResultAsString,
            },
          ],
        })
        .on('event', async (event) => {
          const listener = this.streamEventTypesListeners.get(event.event);
          if (listener) {
            try {
              await listener(event);
              if (event.event === 'thread.message.completed') {
                resolve();
              }
            } catch (error) {
              reject(error);
            }
          }
        })
        .on('end', () => {
          if (this.response) {
            try {
              this.response.end();
              resolve();
            } catch (error) {
              reject(error);
            }
          }
        })
        .on('error', (error) => {
          if (this.response) {
            this.response.end();
          }
          reject(error);
        });
    });
  }
}

// Unrealized handlers:

// this.streamEventTypesListeners.set('thread.created', (_event: AssistantStreamEvent.ThreadCreated) => {});
// this.streamEventTypesListeners.set('thread.run.created', (_event: AssistantStreamEvent.ThreadRunCreated) => {});
// this.streamEventTypesListeners.set('thread.run.queued', (_event: AssistantStreamEvent.ThreadRunQueued) => {});
// this.streamEventTypesListeners.set(
//   'thread.run.in_progress',
//   (_event: AssistantStreamEvent.ThreadRunInProgress) => {},
// );
// this.streamEventTypesListeners.set('thread.run.completed', (_event: AssistantStreamEvent.ThreadRunCompleted) => {});
// this.streamEventTypesListeners.set('thread.run.failed', (_event: AssistantStreamEvent.ThreadRunFailed) => {});
// this.streamEventTypesListeners.set(
//   'thread.run.cancelling',
//   (_event: AssistantStreamEvent.ThreadRunCancelling) => {},
// );
// this.streamEventTypesListeners.set('thread.run.cancelled', (_event: AssistantStreamEvent.ThreadRunCancelled) => {});
// this.streamEventTypesListeners.set('thread.run.expired', (_event: AssistantStreamEvent.ThreadRunExpired) => {});
// this.streamEventTypesListeners.set(
//   'thread.run.step.created',
//   (_event: AssistantStreamEvent.ThreadRunStepCreated) => {},
// );
// this.streamEventTypesListeners.set(
//   'thread.run.step.in_progress',
//   (_event: AssistantStreamEvent.ThreadRunStepInProgress) => {},
// );
// this.streamEventTypesListeners.set(
//   'thread.run.step.delta',
//   (_event: AssistantStreamEvent.ThreadRunStepDelta) => {},
// );
// this.streamEventTypesListeners.set(
//   'thread.run.step.completed',
//   (_event: AssistantStreamEvent.ThreadRunStepCompleted) => {},
// );
// this.streamEventTypesListeners.set(
//   'thread.run.step.failed',
//   (_event: AssistantStreamEvent.ThreadRunStepFailed) => {},
// );
// this.streamEventTypesListeners.set(
//   'thread.run.step.cancelled',
//   (_event: AssistantStreamEvent.ThreadRunStepCancelled) => {},
// );
// this.streamEventTypesListeners.set(
//   'thread.run.step.expired',
//   (_event: AssistantStreamEvent.ThreadRunStepExpired) => {},
// );
// this.streamEventTypesListeners.set(
//   'thread.message.created',
//   (_event: AssistantStreamEvent.ThreadMessageCreated) => {},
// );
// this.streamEventTypesListeners.set(
//   'thread.message.in_progress',
//   (_event: AssistantStreamEvent.ThreadMessageInProgress) => {},
// );
// this.streamEventTypesListeners.set(
//   'thread.message.incomplete',
//   (_event: AssistantStreamEvent.ThreadMessageIncomplete) => {},
// );
// this.streamEventTypesListeners.set('error', (event: AssistantStreamEvent) => {
//   console.error(`Error: ${event}`);
// });
