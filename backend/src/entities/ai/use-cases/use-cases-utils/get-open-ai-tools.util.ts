import { FunctionTool, Tool } from 'openai/resources/responses/responses.js';

export function getOpenAiTools(isMongoTools: boolean): Array<Tool> {
  const getTableStructureTool: FunctionTool = {
    name: 'getTableStructure',
    description: 'Returns the structure of the specified table and related information.',
    type: 'function',
    strict: true,
    parameters: {
      type: 'object',
      properties: {
        tableName: {
          type: 'string',
          description: 'The name of the table to get the structure for.',
        },
      },
      required: ['tableName'],
      additionalProperties: false,
    },
  };

  const executeAggregationPipelineTool: FunctionTool = {
    name: 'executeAggregationPipeline',
    description:
      'Executes a MongoDB aggregation pipeline and returns the results. Do not drop the database or any data from the database.',
    type: 'function',
    strict: true,
    parameters: {
      type: 'object',
      properties: {
        pipeline: {
          type: 'string',
          description: 'The MongoDB aggregation pipeline to execute.',
        },
      },
      required: ['pipeline'],
      additionalProperties: false,
    },
  };

  const executeRawSqlTool: FunctionTool = {
    name: 'executeRawSql',
    description:
      'Executes a raw SQL query and returns the results. Do not drop the database or any data from the database.',
    type: 'function',
    strict: true,
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The SQL query to execute. Table and column names should be properly escaped.',
        },
      },
      required: ['query'],
      additionalProperties: false,
    },
  };

  const tools: Array<Tool> = [];
  if (isMongoTools) {
    tools.push(getTableStructureTool, executeAggregationPipelineTool);
  } else {
    tools.push(getTableStructureTool, executeRawSqlTool);
  }
  return tools;
}
