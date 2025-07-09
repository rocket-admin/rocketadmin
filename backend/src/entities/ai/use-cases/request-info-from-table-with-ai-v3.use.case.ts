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
    conversationHistory?: Array<{ role: string; content: string }>;
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
    // Remove API key logging for security
    const openai = new OpenAI({ apiKey: openApiKey });
    const { connectionId, tableName, user_message, master_password, user_id, response } = inputData;

    // Initialize conversation history if it doesn't exist in the session
    if (!response.req.session) {
      (response.req as any).session = { conversationHistory: [] };
    } else if (!response.req.session.conversationHistory) {
      response.req.session.conversationHistory = [];
    }

    // Add the current user message to conversation history
    response.req.session.conversationHistory.push({
      role: 'user',
      content: user_message,
    });

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

    response.setHeader('Content-Type', 'text/event-stream');
    response.setHeader('Cache-Control', 'no-cache');
    response.setHeader('Connection', 'keep-alive');

    const tools = getOpenAiTools(isMongoDb); // Initialize heartbeat interval
    let heartbeatInterval: NodeJS.Timeout | null = null;

    try {
      // Send initial feedback to client
      response.write(`data: Analyzing your request about the "${tableName}" table...\n\n`);

      // Set up a heartbeat to keep the connection alive
      heartbeatInterval = setInterval(() => {
        try {
          response.write(`:heartbeat\n\n`);
          console.log('Heartbeat sent to keep connection alive');
        } catch (err) {
          console.error('Error sending heartbeat:', err);
          clearInterval(heartbeatInterval);
        }
      }, 5000); // Send heartbeat every 5 seconds

      const system_prompt = `You are an AI assistant helping with database queries.
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
      try {
        // Build a system prompt that includes conversation history if available
        let enhancedSystemPrompt = system_prompt;

        // Add conversation history to the system prompt
        if (response.req.session.conversationHistory.length > 1) {
          const previousConversation = response.req.session.conversationHistory
            .slice(0, -1) // Exclude the current message which we just added
            .map((msg) => `${msg.role}: ${msg.content}`)
            .join('\n\n');

          enhancedSystemPrompt += `\n\nPrevious conversation context:\n${previousConversation}\n\nPlease keep this context in mind when responding.`;
          console.log('Added conversation history to system prompt');
        }

        const stream = await openai.responses.create({
          model: 'gpt-4.1',
          input: user_message,
          tool_choice: 'auto',
          instructions: enhancedSystemPrompt,
          user: user_id,
          stream: true,
          tools: tools,
        });

        let currentToolCall = null;
        const toolCalls = [];

        // Buffer to collect the full AI response for saving to conversation history
        let aiResponseBuffer = '';

        for await (const chunk of stream) {
          // Log all chunks in development
          console.log('Chunk received:', JSON.stringify(chunk, null, 2));

          // Define a type for the chunks
          type ResponseChunk = {
            type: string;
            delta?: string;
            item_id?: string;
            item?: {
              id: string;
              type: string;
              name?: string;
              arguments?: string;
              content?: string;
              text?: string;
              function?: {
                name: string;
                arguments: string;
              };
            };
            output_index?: number;
            arguments?: string;
            text?: string;
            index?: number;
            output_text?: {
              delta?: string;
              done?: boolean;
            };
            content_part?: {
              added?: string;
              done?: boolean;
            };
            part?: {
              text?: string;
            };
            response?: {
              output?: Array<{
                type: string;
                text?: string;
              }>;
              id?: string;
              done?: boolean;
              completed?: boolean;
              status?: string;
              content?: {
                delta?: string;
              };
            };
          };

          const typedChunk = chunk as ResponseChunk;

          // Handle text content - check for multiple possible text fields
          if (typedChunk.type === 'response.text.delta' && typedChunk.delta) {
            console.log('Text delta received:', typedChunk.delta);
            if (!this.isEmptyContent(typedChunk.delta)) {
              response.write(`data: ${typedChunk.delta}\n\n`);
              aiResponseBuffer += typedChunk.delta;
            }
          } else if (
            typedChunk.type === 'response.output_item.added' &&
            typedChunk.item?.type === 'text' &&
            typedChunk.item?.text
          ) {
            console.log('Output item text received:', typedChunk.item.text);
            if (!this.isEmptyContent(typedChunk.item.text)) {
              response.write(`data: ${typedChunk.item.text}\n\n`);
              aiResponseBuffer += typedChunk.item.text;
            }
          } else if (typedChunk.text) {
            // Fallback for any text content
            console.log('Other text content found:', typedChunk.text);
            if (!this.isEmptyContent(typedChunk.text)) {
              response.write(`data: ${typedChunk.text}\n\n`);
              aiResponseBuffer += typedChunk.text;
            }
          } else if (typedChunk.type === 'response.content.delta' && typedChunk.delta) {
            console.log('Content delta received:', typedChunk.delta);
            if (!this.isEmptyContent(typedChunk.delta)) {
              response.write(`data: ${typedChunk.delta}\n\n`);
              aiResponseBuffer += typedChunk.delta;
            }
          }
          // Handle output_text.delta which appears in the OpenAI responses API
          else if (typedChunk.type === 'response.output_text.delta' && typedChunk.delta) {
            console.log('Output text delta received:', typedChunk.delta);
            if (!this.isEmptyContent(typedChunk.delta)) {
              response.write(`data: ${typedChunk.delta}\n\n`);
              aiResponseBuffer += typedChunk.delta;
            }
          }
          // Handle content_part.added which appears in the OpenAI responses API
          else if (typedChunk.type === 'response.content_part.added') {
            if (typedChunk.part?.text) {
              console.log('Content part text received:', typedChunk.part.text);
              if (!this.isEmptyContent(typedChunk.part.text)) {
                response.write(`data: ${typedChunk.part.text}\n\n`);
                aiResponseBuffer += typedChunk.part.text;
              }
            } else if (typedChunk.content_part?.added) {
              console.log('Content part added received:', typedChunk.content_part.added);
              if (!this.isEmptyContent(typedChunk.content_part.added)) {
                response.write(`data: ${typedChunk.content_part.added}\n\n`);
                aiResponseBuffer += typedChunk.content_part.added;
              }
            }
          }
          // Additional handlers for other possible text content locations
          else if (typedChunk.type === 'response.message.delta' && typedChunk.delta) {
            console.log('Message delta received:', typedChunk.delta);
            response.write(`data: ${typedChunk.delta}\n\n`);
          } else if (typedChunk.type === 'response.completed' && typedChunk.response?.output) {
            // Try to extract any text from a completed response
            console.log('Completed response received with output');
            const output = typedChunk.response.output;
            for (const item of output) {
              if (item.type === 'text' && item.text) {
                console.log('Text from completed response:', item.text);
                if (!this.isEmptyContent(item.text)) {
                  response.write(`data: ${item.text}\n\n`);
                }
              }
            }
          } else if (typedChunk.type === 'response.output_text.done' && typedChunk.text) {
            // Handle completed text output
            console.log('Output text done received:', typedChunk.text);
            if (!this.isEmptyContent(typedChunk.text)) {
              response.write(`data: ${typedChunk.text}\n\n`);
            }
          } else if (typedChunk.type === 'response.content_part.done') {
            // Handle completed content part
            if (typedChunk.text) {
              console.log('Content part done received with text:', typedChunk.text);
              if (!this.isEmptyContent(typedChunk.text)) {
                response.write(`data: ${typedChunk.text}\n\n`);
              }
            } else if (typedChunk.content_part?.done && typedChunk.part?.text) {
              console.log('Content part done received with part text:', typedChunk.part.text);
              if (!this.isEmptyContent(typedChunk.part.text)) {
                response.write(`data: ${typedChunk.part.text}\n\n`);
              }
            }
          }

          // Send heartbeat to keep connection alive
          if (typedChunk.type === 'response.created' || typedChunk.type === 'response.in_progress') {
            console.log(`Received ${typedChunk.type}, sending heartbeat`);
            response.write(`:heartbeat\n\n`);
          }

          // Log unhandled chunk types for debugging
          if (
            !typedChunk.type.includes('function_call') &&
            !typedChunk.type.includes('text.delta') &&
            !typedChunk.type.includes('output_item') &&
            !typedChunk.type.includes('output_text') &&
            !typedChunk.type.includes('content.delta') &&
            !typedChunk.type.includes('content_part') &&
            !typedChunk.type.includes('message.delta') &&
            !typedChunk.type.includes('response.created') &&
            !typedChunk.type.includes('response.in_progress') &&
            !typedChunk.type.includes('response.completed')
          ) {
            console.log(`Unhandled chunk type: ${typedChunk.type}`, JSON.stringify(typedChunk, null, 2));
          }

          // Handle function call arguments delta for building tool calls
          if (typedChunk.type === 'response.function_call_arguments.delta' && typedChunk.delta && typedChunk.item_id) {
            try {
              if (!currentToolCall) {
                // Find the corresponding tool call in the output array
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
                console.log(`Updated arguments for tool call ${currentToolCall.id}, added: "${typedChunk.delta}"`);
              }
            } catch (error) {
              console.error('Error processing function call arguments delta:', error);
            }
          }

          // Handle new tool call creation
          if (typedChunk.type === 'response.output_item.added' && typedChunk.item?.type === 'function_call') {
            console.log(
              `New function call detected: ${typedChunk.item.name || 'unnamed'} with ID: ${typedChunk.item.id}`,
            );
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
          }

          // Handle completed function call
          if (
            typedChunk.type === 'response.function_call_arguments.done' &&
            typedChunk.item_id &&
            typedChunk.arguments
          ) {
            const relevantToolCall = toolCalls.find((tc) => tc.id === typedChunk.item_id);
            if (relevantToolCall) {
              relevantToolCall.function.arguments = typedChunk.arguments;
              console.log(
                `Finalized arguments for tool call ${relevantToolCall.id}:`,
                relevantToolCall.function.arguments,
              );
            }
          }

          // Process completed tool calls
          if (typedChunk.type === 'response.output_item.done' && typedChunk.item?.type === 'function_call') {
            const completedToolCall = toolCalls.find((tc) => tc.id === typedChunk.item.id);
            if (completedToolCall) {
              try {
                const toolName = completedToolCall.function.name;
                console.log(`Processing completed tool call: ${toolName}`, JSON.stringify(completedToolCall, null, 2));
                response.write(`data: Processing ${toolName} request...\n\n`);

                if (toolName === 'getTableStructure') {
                  // Get table structure info
                  const tableStructureInfo = await this.getTableStructureInfo(
                    dao,
                    tableName,
                    userEmail,
                    foundConnection,
                  );

                  // Send information to the client about what's happening
                  response.write(`data: Fetching table structure information...\n\n`);

                  // Continue the conversation with the tool response
                  // Create an updated system prompt with the table structure info
                  const updatedSystemPrompt =
                    system_prompt +
                    `\n\nHere is the table structure information you requested:\n${JSON.stringify(tableStructureInfo, null, 2)}`;

                  // Continue the conversation with a new request that includes the table structure info
                  let continuedStream;
                  try {
                    // Modify the user message to explicitly encourage using the executeRawSql tool
                    const enhancedMessage = `${user_message}

INSTRUCTIONS: 
1. Analyze the table structure I provided above 
2. Generate the appropriate SQL query based on my question
3. YOU MUST CALL the executeRawSql tool with your generated query - do not skip this step
4. After getting the results, explain them to me in a clear, conversational way
5. Make sure your explanation directly answers my question in a human-friendly manner

After writing a SQL query, you must execute it with the executeRawSql tool to show me the actual data and then explain the results in simple terms.`;

                    console.log('Sending enhanced user message to encourage tool use:', enhancedMessage);

                    continuedStream = await openai.responses.create({
                      model: 'gpt-4.1',
                      input: enhancedMessage,
                      tool_choice: 'auto',
                      instructions: updatedSystemPrompt,
                      user: user_id,
                      stream: true,
                      tools: tools, // Make sure to include the tools in the second request
                    });
                  } catch (innerStreamError) {
                    console.error('Error creating second OpenAI stream:', innerStreamError);
                    response.write(`data: Error continuing the conversation: ${innerStreamError.message}\n\n`);
                    continue;
                  }

                  // Reset for continued processing
                  const innerToolCalls = [];
                  let innerCurrentToolCall = null;

                  // Buffer to collect inner stream AI response
                  let innerAiResponseBuffer = '';

                  console.log('Starting to process inner stream from OpenAI');
                  response.write(`data: Analyzing table structure and preparing response...\n\n`);

                  for await (const innerChunk of continuedStream) {
                    console.log('Inner chunk received:', JSON.stringify(innerChunk, null, 2));
                    const typedInnerChunk = innerChunk as ResponseChunk;

                    // Handle text content - check for multiple possible text fields
                    if (typedInnerChunk.type === 'response.text.delta' && typedInnerChunk.delta) {
                      console.log('Inner text delta received:', typedInnerChunk.delta);
                      if (!this.isEmptyContent(typedInnerChunk.delta)) {
                        response.write(`data: ${typedInnerChunk.delta}\n\n`);
                        innerAiResponseBuffer += typedInnerChunk.delta;
                      }
                    } else if (
                      typedInnerChunk.type === 'response.output_item.added' &&
                      typedInnerChunk.item?.type === 'text' &&
                      typedInnerChunk.item?.text
                    ) {
                      console.log('Inner output item text received:', typedInnerChunk.item.text);
                      if (!this.isEmptyContent(typedInnerChunk.item.text)) {
                        response.write(`data: ${typedInnerChunk.item.text}\n\n`);
                        innerAiResponseBuffer += typedInnerChunk.item.text;
                      }
                    } else if (typedInnerChunk.text) {
                      // Fallback for any text content
                      console.log('Inner other text content found:', typedInnerChunk.text);
                      if (!this.isEmptyContent(typedInnerChunk.text)) {
                        response.write(`data: ${typedInnerChunk.text}\n\n`);
                        innerAiResponseBuffer += typedInnerChunk.text;
                      }
                    } else if (typedInnerChunk.type === 'response.content.delta' && typedInnerChunk.delta) {
                      console.log('Inner content delta received:', typedInnerChunk.delta);
                      if (!this.isEmptyContent(typedInnerChunk.delta)) {
                        response.write(`data: ${typedInnerChunk.delta}\n\n`);
                        innerAiResponseBuffer += typedInnerChunk.delta;
                      }
                    }
                    // Handle output_text.delta for inner stream
                    else if (typedInnerChunk.type === 'response.output_text.delta' && typedInnerChunk.delta) {
                      console.log('Inner output text delta received:', typedInnerChunk.delta);
                      if (!this.isEmptyContent(typedInnerChunk.delta)) {
                        response.write(`data: ${typedInnerChunk.delta}\n\n`);
                        innerAiResponseBuffer += typedInnerChunk.delta;
                      }
                    }
                    // Handle content_part.added for inner stream
                    else if (typedInnerChunk.type === 'response.content_part.added') {
                      if (typedInnerChunk.part?.text) {
                        console.log('Inner content part text received:', typedInnerChunk.part.text);
                        if (!this.isEmptyContent(typedInnerChunk.part.text)) {
                          response.write(`data: ${typedInnerChunk.part.text}\n\n`);
                          innerAiResponseBuffer += typedInnerChunk.part.text;
                        }
                      } else if (typedInnerChunk.content_part?.added) {
                        console.log('Inner content part added received:', typedInnerChunk.content_part.added);
                        if (!this.isEmptyContent(typedInnerChunk.content_part.added)) {
                          response.write(`data: ${typedInnerChunk.content_part.added}\n\n`);
                          innerAiResponseBuffer += typedInnerChunk.content_part.added;
                        }
                      }
                    }
                    // Additional handlers for other possible text content locations
                    else if (typedInnerChunk.type === 'response.message.delta' && typedInnerChunk.delta) {
                      console.log('Inner message delta received:', typedInnerChunk.delta);
                      response.write(`data: ${typedInnerChunk.delta}\n\n`);
                    } else if (typedInnerChunk.type === 'response.completed' && typedInnerChunk.response?.output) {
                      // Try to extract any text from a completed response
                      console.log('Inner completed response received');
                      const output = typedInnerChunk.response.output;
                      for (const item of output) {
                        if (item.type === 'text' && item.text) {
                          console.log('Inner text from completed response:', item.text);
                          if (!this.isEmptyContent(item.text)) {
                            response.write(`data: ${item.text}\n\n`);
                          }
                        }
                      }
                    } else if (typedInnerChunk.type === 'response.output_text.done' && typedInnerChunk.text) {
                      // Handle completed text output for inner stream
                      console.log('Inner output text done received:', typedInnerChunk.text);
                      if (!this.isEmptyContent(typedInnerChunk.text)) {
                        response.write(`data: ${typedInnerChunk.text}\n\n`);
                      }
                    } else if (typedInnerChunk.type === 'response.content_part.done') {
                      // Handle completed content part for inner stream
                      if (typedInnerChunk.text) {
                        console.log('Inner content part done received with text:', typedInnerChunk.text);
                        if (!this.isEmptyContent(typedInnerChunk.text)) {
                          response.write(`data: ${typedInnerChunk.text}\n\n`);
                        }
                      } else if (typedInnerChunk.content_part?.done && typedInnerChunk.part?.text) {
                        console.log('Inner content part done received with part text:', typedInnerChunk.part.text);
                        if (!this.isEmptyContent(typedInnerChunk.part.text)) {
                          response.write(`data: ${typedInnerChunk.part.text}\n\n`);
                        }
                      }
                    }

                    // Send heartbeat for inner stream too
                    if (
                      typedInnerChunk.type === 'response.created' ||
                      typedInnerChunk.type === 'response.in_progress'
                    ) {
                      console.log(`Inner received ${typedInnerChunk.type}, sending heartbeat`);
                      response.write(`:heartbeat\n\n`);
                    }

                    // Log unhandled chunk types for inner stream
                    if (
                      !typedInnerChunk.type.includes('function_call') &&
                      !typedInnerChunk.type.includes('text.delta') &&
                      !typedInnerChunk.type.includes('output_item') &&
                      !typedInnerChunk.type.includes('output_text') &&
                      !typedInnerChunk.type.includes('content.delta') &&
                      !typedInnerChunk.type.includes('content_part') &&
                      !typedInnerChunk.type.includes('message.delta') &&
                      !typedInnerChunk.type.includes('response.created') &&
                      !typedInnerChunk.type.includes('response.in_progress') &&
                      !typedInnerChunk.type.includes('response.completed')
                    ) {
                      console.log(
                        `Inner unhandled chunk type: ${typedInnerChunk.type}`,
                        JSON.stringify(typedInnerChunk, null, 2),
                      );
                    }

                    // Handle function call arguments delta for inner stream
                    if (
                      typedInnerChunk.type === 'response.function_call_arguments.delta' &&
                      typedInnerChunk.delta &&
                      typedInnerChunk.item_id
                    ) {
                      try {
                        console.log(
                          `Inner stream received function call arguments delta for ${typedInnerChunk.item_id}`,
                        );

                        if (!innerCurrentToolCall) {
                          // Find the corresponding tool call in the output array
                          const innerOutputItem = innerToolCalls.find((tc) => tc.id === typedInnerChunk.item_id);
                          if (innerOutputItem) {
                            innerCurrentToolCall = innerOutputItem;
                            console.log(
                              `Inner stream - found existing tool call: ${innerCurrentToolCall.function.name}`,
                            );
                          }
                        }

                        if (innerCurrentToolCall && innerCurrentToolCall.id === typedInnerChunk.item_id) {
                          if (!innerCurrentToolCall.function.arguments) {
                            innerCurrentToolCall.function.arguments = '';
                          }
                          innerCurrentToolCall.function.arguments += typedInnerChunk.delta;
                          console.log(`Inner stream - updated arguments: added "${typedInnerChunk.delta}"`);
                        }
                      } catch (error) {
                        console.error('Error processing inner function call arguments delta:', error);
                      }
                    }

                    // Handle new tool call creation in inner stream
                    if (
                      typedInnerChunk.type === 'response.output_item.added' &&
                      typedInnerChunk.item?.type === 'function_call'
                    ) {
                      console.log(`Inner stream - new function call: ${typedInnerChunk.item.name || 'unnamed'}`);
                      innerCurrentToolCall = {
                        id: typedInnerChunk.item.id,
                        index: typedInnerChunk.output_index || 0,
                        type: 'function',
                        function: {
                          name: typedInnerChunk.item.name || '',
                          arguments: typedInnerChunk.item.arguments || '',
                        },
                      };
                      innerToolCalls.push(innerCurrentToolCall);

                      response.write(
                        `data: Preparing to ${innerCurrentToolCall.function.name.replace(/([A-Z])/g, ' $1').toLowerCase()}...\n\n`,
                      );
                    }

                    // Handle completed function call in inner stream
                    if (
                      typedInnerChunk.type === 'response.function_call_arguments.done' &&
                      typedInnerChunk.item_id &&
                      typedInnerChunk.arguments
                    ) {
                      console.log(`Inner stream - function call arguments completed for ${typedInnerChunk.item_id}`);
                      const relevantInnerToolCall = innerToolCalls.find((tc) => tc.id === typedInnerChunk.item_id);
                      if (relevantInnerToolCall) {
                        relevantInnerToolCall.function.arguments = typedInnerChunk.arguments;
                        console.log(`Inner stream - arguments finalized: ${relevantInnerToolCall.function.arguments}`);
                      }
                    }

                    // Process completed tool calls in inner stream
                    if (
                      typedInnerChunk.type === 'response.output_item.done' &&
                      typedInnerChunk.item?.type === 'function_call'
                    ) {
                      console.log(`Inner stream - completed tool call for ${typedInnerChunk.item.id}`);
                      const completedInnerToolCall = innerToolCalls.find((tc) => tc.id === typedInnerChunk.item.id);
                      if (completedInnerToolCall) {
                        console.log(
                          `Inner stream - processing completed tool call: ${completedInnerToolCall.function.name}`,
                        );
                        response.write(
                          `data: Processing ${completedInnerToolCall.function.name} request from second stream...\n\n`,
                        );

                        await this.processQueryToolCall(
                          completedInnerToolCall,
                          dao,
                          tableName,
                          userEmail,
                          foundConnection,
                          isMongoDb,
                          response,
                        );
                      }
                    }
                  }

                  // Check if no tool calls were made but the response contains SQL queries
                  if (
                    innerToolCalls.length === 0 ||
                    !innerToolCalls.some(
                      (tc) =>
                        tc.function?.name === 'executeRawSql' || tc.function?.name === 'executeAggregationPipeline',
                    )
                  ) {
                    console.log(
                      'Inner stream finished without executing any queries, checking for SQL queries in text...',
                    );

                    // If SQL is detected in the response, try to execute it automatically
                    const sqlDetected = await this.detectAndExecuteSqlQueries(
                      innerAiResponseBuffer,
                      dao,
                      tableName,
                      userEmail,
                      foundConnection,
                      response,
                    );

                    if (sqlDetected) {
                      console.log('SQL query detected and auto-executed from response text');
                    }
                  }

                  // Save the inner AI response to conversation history
                  if (innerAiResponseBuffer.trim()) {
                    console.log(
                      `Inner stream - saving response to conversation history, length: ${innerAiResponseBuffer.length}`,
                    );
                    // Append to the existing AI response or create a new entry
                    if (aiResponseBuffer) {
                      aiResponseBuffer += '\n\n' + innerAiResponseBuffer;
                      console.log('Combined inner stream response with main response');
                    } else {
                      response.req.session.conversationHistory.push({
                        role: 'assistant',
                        content: innerAiResponseBuffer,
                      });
                      console.log(
                        'Saved inner AI response to conversation history, length:',
                        innerAiResponseBuffer.length,
                      );
                    }
                  } else {
                    console.log('Inner stream finished but no content was collected in buffer');
                  }
                } else if (toolName === 'executeRawSql' || toolName === 'executeAggregationPipeline') {
                  await this.processQueryToolCall(
                    completedToolCall,
                    dao,
                    tableName,
                    userEmail,
                    foundConnection,
                    isMongoDb,
                    response,
                  );
                }
              } catch (error) {
                console.error('Error processing tool call:', error);
                response.write(`data: Error processing tool call: ${error.message}\n\n`);
              }
            }
          }
        }

        // Check if any SQL queries were generated but not executed
        if (
          toolCalls.length === 0 ||
          !toolCalls.some(
            (tc) => tc.function?.name === 'executeRawSql' || tc.function?.name === 'executeAggregationPipeline',
          )
        ) {
          console.log('Main stream finished without executing any queries, checking for SQL queries in text...');

          // If SQL is detected in the response, try to execute it automatically
          const sqlDetected = await this.detectAndExecuteSqlQueries(
            aiResponseBuffer,
            dao,
            tableName,
            userEmail,
            foundConnection,
            response,
          );

          if (sqlDetected) {
            console.log('SQL query detected and auto-executed from main stream response');
          }
        }

        // Save the AI's response to the conversation history
        if (aiResponseBuffer.trim()) {
          response.req.session.conversationHistory.push({
            role: 'assistant',
            content: aiResponseBuffer,
          });
          console.log('Saved AI response to conversation history, length:', aiResponseBuffer.length);
        }
      } catch (streamError) {
        console.error('Error creating OpenAI stream:', streamError);
        response.write(`data: Error creating AI stream: ${streamError.message}\n\n`);
        if (streamError.status === 401) {
          response.write(
            `data: This may be due to insufficient API permissions. Ensure your API key has the "api.responses.write" scope.\n\n`,
          );
        } else if (streamError.status === 500) {
          response.write(
            `data: This appears to be a temporary issue with the OpenAI service. Please try again later.\n\n`,
          );
        }
      }

      // Clear the heartbeat interval
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
      }

      // End the response stream
      response.end();
    } catch (error) {
      console.error('Error in AI request processing:', error);
      response.write(`data: An error occurred: ${error.message}\n\n`);

      // Clear the heartbeat interval if it exists
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
      }

      response.end();
    }
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

  private async processQueryToolCall(toolCall, dao, tableName, userEmail, foundConnection, isMongoDb, response) {
    try {
      const openApiKey = getRequiredEnvVariable('OPENAI_API_KEY');
      const openai = new OpenAI({ apiKey: openApiKey });

      // Extract user_id and user_message from the request session for AI context
      const user_id = response.req.session.userId || 'anonymous';
      const user_message =
        response.req.session.conversationHistory?.length > 0
          ? response.req.session.conversationHistory[response.req.session.conversationHistory.length - 1].content
          : 'Query the database';

      const toolName = toolCall.function.name;
      const sanitizedArgs = this.sanitizeJsonString(toolCall.function.arguments);
      const toolArgs = JSON.parse(sanitizedArgs);

      // Send debug message to client to show what's happening
      response.write(`data: Processing ${toolName} request...\n\n`);
      console.log(`Processing tool call ${toolName} with arguments:`, sanitizedArgs);

      if (toolName === 'executeRawSql') {
        const query = toolArgs.query;
        if (!query || typeof query !== 'string') {
          response.write(`data: Invalid SQL query provided.\n\n`);
          console.log('Invalid SQL query provided in tool call');
          return;
        }

        // Validate the query
        if (!this.isValidSQLQuery(query)) {
          response.write(`data: Sorry, I cannot execute this query as it contains potentially harmful operations.\n\n`);
          console.log('SQL query validation failed, potentially harmful:', query);
          return;
        }

        // Wrap the query with a limit for safety
        const finalQuery = this.wrapQueryWithLimit(query, foundConnection.type as ConnectionTypesEnum);
        console.log('Executing SQL query with limit:', finalQuery);

        try {
          const queryResult = await dao.executeRawQuery(finalQuery, tableName, userEmail);
          response.write(`data: Query executed successfully.\n\n`);

          // Try using streaming for human-readable answers first
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
            console.log('Successfully streamed human-readable answer');
          } else {
            // Fall back to the non-streaming method if streaming fails
            console.log('Streaming failed, using non-streaming fallback');

            // Format the results for better readability
            const formattedResults = this.formatQueryResults(queryResult);

            // Generate a human-readable answer based on the query results
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
              // Fall back to just showing results if interpretation fails
              response.write(`data: Results: ${formattedResults}\n\n`);
            }
          }

          console.log(
            'SQL query execution successful, result count:',
            Array.isArray(queryResult) ? queryResult.length : 'not an array',
          );
        } catch (error) {
          console.error('Error executing SQL query:', error);
          response.write(`data: Error executing SQL query: ${error.message}\n\n`);
        }
      } else if (toolName === 'executeAggregationPipeline') {
        const pipeline = toolArgs.pipeline;
        if (!pipeline || typeof pipeline !== 'string') {
          response.write(`data: Invalid MongoDB pipeline provided.\n\n`);
          console.log('Invalid MongoDB pipeline provided in tool call');
          return;
        }

        // Validate the pipeline
        if (!this.isValidMongoDbCommand(pipeline)) {
          response.write(
            `data: Sorry, I cannot execute this pipeline as it contains potentially harmful operations.\n\n`,
          );
          console.log('MongoDB pipeline validation failed, potentially harmful:', pipeline);
          return;
        }

        try {
          console.log('Executing MongoDB pipeline:', pipeline);
          const pipelineResult = await dao.executeRawQuery(pipeline, tableName, userEmail);
          response.write(`data: Pipeline executed successfully.\n\n`);

          // Try using streaming for human-readable answers first
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
            console.log('Successfully streamed MongoDB pipeline interpretation');
          } else {
            // Fall back to the non-streaming method if streaming fails
            console.log('Streaming failed for MongoDB, using non-streaming fallback');

            // Format the results for better readability
            const formattedResults = this.formatQueryResults(pipelineResult);

            // Generate a human-readable answer based on the pipeline results
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
              // Fall back to just showing results if interpretation fails
              response.write(`data: Results: ${formattedResults}\n\n`);
            }

            console.log(
              'MongoDB pipeline execution successful, result count:',
              Array.isArray(pipelineResult) ? pipelineResult.length : 'not an array',
            );
          }
        } catch (error) {
          console.error('Error executing MongoDB pipeline:', error);
          response.write(`data: Error executing MongoDB pipeline: ${error.message}\n\n`);
        }
      } else if (toolName === 'getTableStructure') {
        // This is handled directly in the main function, but we'll add a message just in case
        console.log('getTableStructure tool call processed via callback handler');
        response.write(`data: Table structure information has been fetched.\n\n`);
      } else {
        console.log(`Unknown tool call: ${toolName}`);
        response.write(`data: Received unknown tool call: ${toolName}\n\n`);
      }
    } catch (error) {
      console.error('Error in processQueryToolCall:', error);
      response.write(`data: Error processing query tool call: ${error.message}\n\n`);
    }
  }

  private buildSystemPromptWithTableStructure(
    basePrompt: string,
    tableStructureInfo: any,
    conversationHistory: Array<{ role: string; content: string }>,
    isMongoDb: boolean,
  ): string {
    // Create an updated system prompt with the table structure info
    let enhancedPrompt =
      basePrompt +
      `\n\nHere is the table structure information you requested:\n${JSON.stringify(tableStructureInfo, null, 2)}`;

    // Add conversation history if available
    if (conversationHistory.length > 1) {
      const previousConversation = conversationHistory
        .slice(0, -1) // Exclude the current message
        .map((msg, index) => `[${index + 1}] ${msg.role}: ${msg.content}`)
        .join('\n\n');

      enhancedPrompt += `\n\nPrevious conversation context:\n${previousConversation}\n\nPlease keep this context in mind when responding.`;
      console.log('Added conversation history to system prompt with table structure');
    }

    // Add specific guidance based on the database type
    if (isMongoDb) {
      enhancedPrompt += `\n\nIMPORTANT INSTRUCTIONS:
1. Please use MongoDB aggregation pipeline syntax for this MongoDB database
2. ALWAYS call the executeAggregationPipeline tool with your generated pipeline
3. Do not merely show the pipeline in your response without executing it`;
    } else {
      enhancedPrompt += `\n\nIMPORTANT INSTRUCTIONS:
1. Please use standard SQL syntax appropriate for this database type
2. ALWAYS call the executeRawSql tool with your generated SQL query
3. Do not merely show the SQL in your response without executing it with the tool
4. After showing a SQL query, immediately call executeRawSql with that exact query`;
    }

    console.log('Built enhanced system prompt with table structure');
    return enhancedPrompt;
  }

  private formatQueryResults(results: any): string {
    try {
      if (!results) {
        return 'No results returned';
      }

      // If it's not an array or the array is empty
      if (!Array.isArray(results) || results.length === 0) {
        return JSON.stringify(results, null, 2);
      }

      // For small result sets, just return the full JSON
      if (results.length <= 5) {
        return JSON.stringify(results, null, 2);
      }

      // For larger results, return the first 5 items and a count
      const sample = results.slice(0, 5);
      return `${JSON.stringify(sample, null, 2)}\n\n(Showing 5 of ${results.length} results)`;
    } catch (error) {
      console.error('Error formatting query results:', error);
      return JSON.stringify(results);
    }
  }

  /**
   * Detects SQL queries in the AI's response text and executes them if needed.
   * This acts as a fallback when the model includes a SQL query but doesn't call executeRawSql.
   */
  private async detectAndExecuteSqlQueries(
    text: string,
    dao,
    tableName,
    userEmail,
    foundConnection,
    response,
  ): Promise<boolean> {
    try {
      // Simple regex to detect SQL SELECT queries in markdown or plain text
      const sqlPattern = /```(?:sql)?\s*(SELECT\s+[^;]+;?)```|`(SELECT\s+[^;]+;?)`|(SELECT\s+.*\s+FROM\s+[^;]+;?)/im;

      const match = text.match(sqlPattern);
      if (!match) return false;

      // Extract the query from whichever group matched
      const query = (match[1] || match[2] || match[3] || '').trim();

      if (!query || query.length < 10) return false; // Sanity check

      console.log('Detected SQL query in AI response without tool call:', query);
      response.write(`data: I see you generated a SQL query. Let me execute that for you automatically...\n\n`);

      // Validate the query before executing
      if (!this.isValidSQLQuery(query)) {
        response.write(`data: Cannot automatically execute this query as it may not be safe.\n\n`);
        return false;
      }

      // Execute the query
      const databaseType = foundConnection.type as ConnectionTypesEnum;
      const finalQuery = this.wrapQueryWithLimit(query, databaseType);

      try {
        const queryResult = await dao.executeRawQuery(finalQuery, tableName, userEmail);
        response.write(`data: Automatically executed query.\n\n`);

        // Setup OpenAI for interpretation
        const openApiKey = getRequiredEnvVariable('OPENAI_API_KEY');
        const openai = new OpenAI({ apiKey: openApiKey });
        const user_id = response.req.session.userId || 'anonymous';
        const user_message =
          response.req.session.conversationHistory?.length > 0
            ? response.req.session.conversationHistory[response.req.session.conversationHistory.length - 1].content
            : 'Query the database';

        // Get human-readable interpretation
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
          // Format and return results if interpretation fails
          const formattedResults = this.formatQueryResults(queryResult);
          response.write(`data: Results: ${formattedResults}\n\n`);
        }

        return true;
      } catch (error) {
        console.error('Error auto-executing detected SQL query:', error);
        response.write(`data: Error executing detected SQL query: ${error.message}\n\n`);
        return true; // Still mark as handled
      }
    } catch (error) {
      console.error('Error in detectAndExecuteSqlQueries:', error);
      return false;
    }
  }

  /**
   * Generates a human-readable answer from query results using OpenAI
   * @param query The query that was executed
   * @param queryResult The raw query results
   * @param originalQuestion The original user question
   * @param connection The database connection
   * @param openai The OpenAI instance
   * @param userId The user ID for tracking
   * @returns A human-readable explanation of the results
   */
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

      // Format the query results to a simplified version
      const simplifiedResults = this.simplifyQueryResults(queryResult);

      // Instructions for generating human-readable answers
      const instructions = `You are a helpful assistant that explains database query results in simple, human-readable terms.
Your task is to analyze the query results and provide a clear, conversational explanation.
Focus directly on answering the user's original question in a friendly tone.
Mention the number of records found if relevant and summarize key insights.
Do not mention SQL syntax or technical implementation details unless specifically asked.
Keep your response concise and easy to understand.`;

      // Input prompt with all the necessary context
      const inputPrompt = `
I need you to explain these database query results in simple terms:

Original question: "${originalQuestion}"

Database type: ${this.convertDdTypeEnumToReadableString(connection.type as ConnectionTypesEnum)}
Query executed: ${query}

Query results: ${JSON.stringify(simplifiedResults, null, 2)}

Please provide a clear, concise, and conversational answer that directly addresses my original question.
`;

      try {
        // Try using responses API for consistency with the rest of the application
        const response = await openai.responses.create({
          model: 'gpt-4',
          input: inputPrompt,
          instructions: instructions,
          user: userId,
          stream: false, // Set to false for non-streaming response
        });

        // Extract text content from the response
        let humanReadableAnswer = '';

        if (response && response.output) {
          // Cast the output to a more generic type to handle various response formats
          const outputItems = response.output as Array<any>;

          for (const item of outputItems) {
            // Check for text content in different possible formats
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
        // Continue to fallback with detailed error info
        if (responsesError instanceof Error) {
          console.error('Responses API error details:', responsesError.message);
          console.error('Responses API error stack:', responsesError.stack);
        }
      }

      // Fallback to chat completions API if responses API fails
      console.log('Using chat completions API as fallback');
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

        // Extract answer from completions response
        if (completion.choices && completion.choices.length > 0) {
          const humanReadableAnswer = completion.choices[0].message.content;
          console.log('Human-readable answer generated with completions API');
          return humanReadableAnswer;
        } else {
          console.log('No completion choices returned');
          return `Based on the query results, there are ${this.extractResultCount(queryResult)} records matching your criteria.`;
        }
      } catch (completionsError) {
        console.error('Error using completions API as fallback:', completionsError);

        // Final fallback if both APIs fail
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

  /**
   * Get the first result from query results for fallback responses
   */
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

  /**
   * Get a sample of results for fallback responses
   */
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

  /**
   * Streams a human-readable answer from query results using OpenAI responses API
   * @param query The query that was executed
   * @param queryResult The raw query results
   * @param originalQuestion The original user question
   * @param connection The database connection
   * @param openai The OpenAI instance
   * @param userId The user ID for tracking
   * @param response The HTTP response object to stream data to
   * @returns Promise<boolean> that resolves to true if streaming succeeded
   */
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
      response.write(`data: Generating a human-friendly explanation of the results...\n\n`);

      // Format the query results to a simplified version
      const simplifiedResults = this.simplifyQueryResults(queryResult);

      // Instructions for generating human-readable answers
      const instructions = `You are a helpful assistant that explains database query results in simple, human-readable terms.
Your task is to analyze the query results and provide a clear, conversational explanation.
Focus directly on answering the user's original question in a friendly tone.
Mention the number of records found if relevant and summarize key insights.
Do not mention SQL syntax or technical implementation details unless specifically asked.
Keep your response concise and easy to understand.`;

      // Input prompt with all the necessary context
      const inputPrompt = `
I need you to explain these database query results in simple terms:

Original question: "${originalQuestion}"

Database type: ${this.convertDdTypeEnumToReadableString(connection.type as ConnectionTypesEnum)}
Query executed: ${query}

Query results: ${JSON.stringify(simplifiedResults, null, 2)}

Please provide a clear, concise, and conversational answer that directly addresses my original question.
`;

      try {
        // Use the responses API with streaming
        const stream = await openai.responses.create({
          model: 'gpt-4',
          input: inputPrompt,
          instructions: instructions,
          user: userId,
          stream: true, // Enable streaming
        });

        // Define a custom type for the chunk processing
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
          output?: any; // For handling the complete output object
        };

        // Process the stream chunks
        let hasReceivedContent = false;
        let fullResponse = ''; // Accumulate the complete response
        let seenFullContent = false; // Flag to track if we've seen the complete content
        const processedChunkIds = new Set(); // Track already processed chunks to avoid duplicates

        for await (const chunk of stream) {
          // Cast the chunk to our simplified type
          const typedChunk = chunk as unknown as StreamChunk;

          // Debug logging - only in development
          if (process.env.NODE_ENV === 'development') {
            console.log(`Received chunk type: ${typedChunk.type}`);
          }

          // Skip duplicate chunks if they have an ID we've seen
          if (typedChunk.item?.id && processedChunkIds.has(typedChunk.item.id)) {
            continue;
          }

          // Add the ID to our tracking set if it exists
          if (typedChunk.item?.id) {
            processedChunkIds.add(typedChunk.item.id);
          }

          // Handle specific types that might indicate full content is coming
          if (
            typedChunk.type === 'response.output.complete' ||
            typedChunk.type === 'response.completed' ||
            typedChunk.type === 'response.message.delta' ||
            typedChunk.type === 'response.message.completed' ||
            typedChunk.type === 'response.output.done'
          ) {
            seenFullContent = true;
            continue;
          }

          // If this chunk has more than 50 characters, it's likely a full message repeat
          // Skip it to avoid duplication unless it's the very first content we're receiving
          const contentLength = this.getContentLength(typedChunk);
          if (hasReceivedContent && contentLength > 50) {
            console.log('Skipping suspected full message duplicate:', contentLength, 'characters');
            seenFullContent = true;
            continue;
          }

          // If we've seen the full content already, only process heartbeats
          if (seenFullContent && typedChunk.type !== 'response.created' && typedChunk.type !== 'response.in_progress') {
            continue;
          }

          // Handle text content in various forms based on observed data patterns
          if (typedChunk.delta && typeof typedChunk.delta === 'string') {
            // Handle delta updates - always send each token to maintain streaming appearance
            hasReceivedContent = true;
            fullResponse += typedChunk.delta;
            response.write(`data: ${this.safeStringify(typedChunk.delta)}\n\n`);
          } else if (typedChunk.item?.text) {
            // Handle direct text in item
            hasReceivedContent = true;
            fullResponse += this.safeStringify(typedChunk.item.text);
            response.write(`data: ${this.safeStringify(typedChunk.item.text)}\n\n`);
          } else if (typedChunk.item?.content) {
            // Handle content in item
            hasReceivedContent = true;
            fullResponse += this.safeStringify(typedChunk.item.content);
            response.write(`data: ${this.safeStringify(typedChunk.item.content)}\n\n`);
          } else if (typedChunk.text) {
            // Handle direct text property
            hasReceivedContent = true;
            fullResponse += this.safeStringify(typedChunk.text);
            response.write(`data: ${this.safeStringify(typedChunk.text)}\n\n`);
          } else if (typedChunk.content) {
            // Handle direct content property
            hasReceivedContent = true;
            fullResponse += this.safeStringify(typedChunk.content);
            response.write(`data: ${this.safeStringify(typedChunk.content)}\n\n`);
          } else if (typedChunk.part?.text) {
            // Handle text in part property
            hasReceivedContent = true;
            fullResponse += this.safeStringify(typedChunk.part.text);
            response.write(`data: ${this.safeStringify(typedChunk.part.text)}\n\n`);
          } else if (typedChunk.part?.content) {
            // Handle content in part property
            hasReceivedContent = true;
            fullResponse += this.safeStringify(typedChunk.part.content);
            response.write(`data: ${this.safeStringify(typedChunk.part.content)}\n\n`);
          } else if (typedChunk.content_part?.added) {
            // Handle added content in content_part
            hasReceivedContent = true;
            const addedContent = this.safeStringify(typedChunk.content_part.added);
            fullResponse += addedContent;
            response.write(`data: ${addedContent}\n\n`);
          } else if (typedChunk.output) {
            // Skip full output object to prevent duplication
            console.log('Received full output object, skipping to avoid duplication');
            seenFullContent = true;
          }

          // Keep connection alive for specific chunk types
          if (typedChunk.type === 'response.created' || typedChunk.type === 'response.in_progress') {
            response.write(`:heartbeat\n\n`);
          }
        }

        // After processing all chunks, send the complete accumulated response if needed
        // Only if we haven't already seen the full content and haven't already streamed token by token
        if (hasReceivedContent && fullResponse.trim() && !seenFullContent && !processedChunkIds.size) {
          // Send the complete response only if we didn't already send the full content
          response.write(`data: ${this.safeStringify(fullResponse.trim())}\n\n`);
        }

        // Send end marker if content was streamed
        if (hasReceivedContent) {
          response.write(`data: [END]\n\n`);
          console.log('Successfully streamed human-readable answer');
          return true;
        } else {
          console.log('No content was streamed from responses API');
          return false;
        }
      } catch (streamingError) {
        console.error('Error streaming responses API interpretation:', streamingError);
        // Additional logging to help diagnose the issue
        if (streamingError instanceof Error) {
          console.error('Error details:', streamingError.message);
          console.error('Error stack:', streamingError.stack);
        }
        return false;
      }
    } catch (error) {
      console.error('Error in streamHumanReadableAnswer:', error);
      return false;
    }
  }

  /**
   * Simplifies query results for better processing by AI
   * @param results The raw query results
   * @returns A simplified version of the results
   */
  private simplifyQueryResults(results: any): any {
    try {
      // Handle empty or null results
      if (!results) {
        return { type: 'empty', message: 'No results returned' };
      }

      // Handle error results
      if (results.error || (typeof results === 'object' && 'error' in results)) {
        return {
          type: 'error',
          message: typeof results.error === 'string' ? results.error : 'An error occurred in the query',
          details: results.error || results,
        };
      }

      // If it's a PostgreSQL/MySQL-like result with rows property
      if (results.rows && Array.isArray(results.rows)) {
        const rowCount = typeof results.rowCount === 'number' ? results.rowCount : results.rows.length;

        // Create a safe simplified representation
        const simplifiedResult = {
          type: 'rowset',
          count: rowCount,
          totalRows: results.rows.length,
          hasMoreRows: rowCount > 10,
          sample: [],
        };

        try {
          // Add field names if available
          if (results.fields && Array.isArray(results.fields)) {
            simplifiedResult['fields'] = results.fields.map((f) => f.name || f);
          }

          // Add a sample of rows (up to 10)
          if (results.rows.length > 0) {
            // Get the first 10 rows maximum
            const sampleRows = results.rows.slice(0, 10);

            // Convert them to safe string representation
            simplifiedResult.sample = JSON.parse(JSON.stringify(sampleRows));
          }
        } catch (innerError) {
          console.error('Error processing row data:', innerError);
          // If JSON conversion fails, create a simpler representation
          simplifiedResult['sample'] = results.rows.slice(0, 10).map((row) =>
            Object.keys(row).reduce((acc, key) => {
              // Convert each value to string to avoid JSON issues
              // eslint-disable-next-line security/detect-object-injection
              acc[key] = String(row[key] !== null ? row[key] : 'null');
              return acc;
            }, {}),
          );
        }

        return simplifiedResult;
      }

      // If it's a direct array of results
      if (Array.isArray(results)) {
        try {
          return {
            type: 'array',
            count: results.length,
            totalItems: results.length,
            hasMoreItems: results.length > 10,
            sample: JSON.parse(JSON.stringify(results.slice(0, 10))), // Safe deep copy of first 10 items
          };
        } catch (jsonError) {
          console.error('Error stringifying array results:', jsonError);
          // Fallback to simple string representation
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

      // If results have a complex structure with fields and metadata
      if (results.fields) {
        // Extract just the key data points
        const simplifiedResult = {
          type: 'fieldset',
          count: results.rowCount || (results.rows ? results.rows.length : 0),
          fields: [],
          sample: [],
        };

        try {
          // Add field names if available
          if (Array.isArray(results.fields)) {
            simplifiedResult.fields = results.fields.map((f) => f.name || f);
          }

          // Add sample rows if available
          if (results.rows && results.rows.length > 0) {
            simplifiedResult.sample = JSON.parse(JSON.stringify(results.rows.slice(0, 10)));
          }
        } catch (jsonError) {
          console.error('Error processing fieldset data:', jsonError);
          // Create a simplified representation of the fields
          if (Array.isArray(results.fields)) {
            simplifiedResult.fields = results.fields.map((f) => String(f.name || f));
          }

          // Create a simplified representation of the rows
          if (results.rows && results.rows.length > 0) {
            simplifiedResult.sample = [{ error: 'Could not convert row data to JSON' }];
          }
        }

        return simplifiedResult;
      }

      // Special case for MongoDB results which may have cursor or similar properties
      if (results.cursor || results.toArray || results.forEach) {
        return {
          type: 'mongodb_cursor',
          message: 'MongoDB cursor results (simplified)',
          // Convert to a simple object representation
          data:
            typeof results.toArray === 'function'
              ? '[MongoDB Cursor: use .toArray() to retrieve results]'
              : '[MongoDB Result Object]',
        };
      }

      // Default case - try to serialize safely
      try {
        // Just return a serialized and re-parsed version to break references
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

  /**
   * Extracts a count from query results
   */
  private extractResultCount(results: any): number {
    try {
      if (!results) return 0;

      // Check for common count result patterns
      if (results.rows && results.rows.length > 0) {
        // Look for a count column
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

  /**
   * Safely converts any value to a string, preventing [object Object] in output
   * @param value Any value to be stringified
   * @returns A safe string representation
   */
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

  /**
   * Gets the approximate length of content in a chunk
   * @param chunk The chunk to measure
   * @returns The length of the content in characters
   */
  private getContentLength(chunk: any): number {
    try {
      // Check all possible content locations
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
          // Try to estimate the size of the object
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
}
