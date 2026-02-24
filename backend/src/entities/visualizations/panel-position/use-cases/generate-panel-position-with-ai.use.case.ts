import { BadRequestException, Inject, Injectable, Logger, NotFoundException, Scope } from '@nestjs/common';
import { getDataAccessObject } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/create-data-access-object.js';
import { ConnectionTypesEnum } from '@rocketadmin/shared-code/dist/src/shared/enums/connection-types-enum.js';
import { IDataAccessObject } from '@rocketadmin/shared-code/dist/src/shared/interfaces/data-access-object.interface.js';
import { IDataAccessObjectAgent } from '@rocketadmin/shared-code/dist/src/shared/interfaces/data-access-object-agent.interface.js';
import AbstractUseCase from '../../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../../common/data-injection.tokens.js';
import { DashboardWidgetTypeEnum } from '../../../../enums/dashboard-widget-type.enum.js';
import { Messages } from '../../../../exceptions/text/messages.js';
import { AICoreService, AIProviderType, cleanAIJsonResponse } from '../../../../ai-core/index.js';
import { GeneratePanelPositionWithAiDs } from '../data-structures/generate-panel-position-with-ai.ds.js';
import { GeneratedPanelWithPositionDto } from '../dto/generated-panel-with-position.dto.js';
import { IGeneratePanelPositionWithAi } from './panel-position-use-cases.interface.js';
import { validateQuerySafety } from '../../panel/utils/check-query-is-safe.util.js';

interface AIGeneratedWidgetResponse {
	name: string;
	description: string;
	query_text: string;
	widget_type: 'chart' | 'table' | 'counter' | 'text';
	chart_type?: 'bar' | 'line' | 'pie' | 'doughnut' | 'polarArea';
	widget_options?: {
		label_column?: string;
		value_column?: string;
		series?: Array<{
			value_column: string;
			label?: string;
			color?: string;
		}>;
		stacked?: boolean;
		horizontal?: boolean;
		show_data_labels?: boolean;
		legend?: {
			show?: boolean;
			position?: 'top' | 'bottom' | 'left' | 'right';
		};
	};
}

const MAX_FEEDBACK_ITERATIONS = 3;

const EXPLAIN_SUPPORTED_TYPES: ReadonlySet<ConnectionTypesEnum> = new Set([
	ConnectionTypesEnum.postgres,
	ConnectionTypesEnum.agent_postgres,
	ConnectionTypesEnum.mysql,
	ConnectionTypesEnum.agent_mysql,
	ConnectionTypesEnum.clickhouse,
	ConnectionTypesEnum.agent_clickhouse,
]);

interface TableInfo {
	table_name: string;
	columns: Array<{ name: string; type: string; nullable: boolean }>;
}

@Injectable({ scope: Scope.REQUEST })
export class GeneratePanelPositionWithAiUseCase
	extends AbstractUseCase<GeneratePanelPositionWithAiDs, GeneratedPanelWithPositionDto>
	implements IGeneratePanelPositionWithAi
{
	private readonly logger = new Logger(GeneratePanelPositionWithAiUseCase.name);

	constructor(
		@Inject(BaseType.GLOBAL_DB_CONTEXT)
		protected _dbContext: IGlobalDatabaseContext,
		private readonly aiCoreService: AICoreService,
	) {
		super();
	}

	public async implementation(inputData: GeneratePanelPositionWithAiDs): Promise<GeneratedPanelWithPositionDto> {
		const {
			dashboardId,
			connectionId,
			masterPassword,
			chart_description,
			table_name,
			name,
			position_x,
			position_y,
			width,
			height,
		} = inputData;

		const foundConnection = await this._dbContext.connectionRepository.findAndDecryptConnection(
			connectionId,
			masterPassword,
		);

		if (!foundConnection) {
			throw new NotFoundException(Messages.CONNECTION_NOT_FOUND);
		}

		const foundDashboard = await this._dbContext.dashboardRepository.findDashboardByIdAndConnectionId(
			dashboardId,
			connectionId,
		);

		if (!foundDashboard) {
			throw new NotFoundException(Messages.DASHBOARD_NOT_FOUND);
		}

		const dao = getDataAccessObject(foundConnection);

		let tableInfo: TableInfo;

		try {
			const structure = await dao.getTableStructure(table_name, null);
			tableInfo = {
				table_name: table_name,
				columns: structure.map((col) => ({
					name: col.column_name,
					type: col.data_type,
					nullable: col.allow_null,
				})),
			};
		} catch (error) {
			throw new BadRequestException(`Failed to get table structure for "${table_name}": ${error.message}`);
		}

		if (tableInfo.columns.length === 0) {
			throw new BadRequestException(`The specified table "${table_name}" does not have any columns or does not exist.`);
		}

		const prompt = this.buildPrompt(chart_description, tableInfo, foundConnection.type);

		const aiResponse = await this.aiCoreService.completeWithProvider(AIProviderType.BEDROCK, prompt, {
			temperature: 0.3,
		});

		const generatedWidget = this.parseAIResponse(aiResponse);

		validateQuerySafety(generatedWidget.query_text, foundConnection.type as ConnectionTypesEnum);

		const refinedWidget = await this.validateAndRefineQueryWithExplain(
			dao,
			generatedWidget,
			tableInfo,
			foundConnection.type as ConnectionTypesEnum,
			chart_description,
		);

		return {
			name: name || refinedWidget.name,
			description: refinedWidget.description || null,
			widget_type: this.mapWidgetType(refinedWidget.widget_type),
			chart_type: refinedWidget.chart_type || null,
			widget_options: refinedWidget.widget_options
				? (refinedWidget.widget_options as unknown as Record<string, unknown>)
				: null,
			query_text: refinedWidget.query_text,
			connection_id: connectionId,
			panel_position: {
				position_x: position_x ?? 0,
				position_y: position_y ?? 0,
				width: width ?? 6,
				height: height ?? 4,
				dashboard_id: dashboardId,
			},
		};
	}

	private buildPrompt(
		chartDescription: string,
		tableInfo: { table_name: string; columns: Array<{ name: string; type: string; nullable: boolean }> },
		databaseType: string,
	): string {
		const schemaDescription = `Table: ${tableInfo.table_name}\n  Columns:\n${tableInfo.columns.map((col) => `    - ${col.name}: ${col.type}${col.nullable ? ' (nullable)' : ''}`).join('\n')}`;

		return `You are a database analytics assistant. Based on the user's chart description and the database schema, generate the SQL query and chart configuration.

DATABASE TYPE: ${databaseType}

DATABASE SCHEMA:
${schemaDescription}

USER'S CHART DESCRIPTION:
"${chartDescription}"

Generate a JSON response with the following structure:
{
  "name": "Short descriptive name for the chart (max 50 chars)",
  "description": "Brief description of what the chart shows",
  "query_text": "SELECT query that returns data for the chart. The query should return columns that can be used for labels and values. Use appropriate aggregations (COUNT, SUM, AVG, etc.) and GROUP BY clauses as needed. Always use the table name '${tableInfo.table_name}'.",
  "widget_type": "chart" | "table" | "counter" | "text",
  "chart_type": "bar" | "line" | "pie" | "doughnut" | "polarArea",
  "widget_options": {
    "label_column": "column name for labels/categories (x-axis)",
    "value_column": "column name for values (y-axis) - use this for single series",
    "series": [
      {
        "value_column": "column name",
        "label": "Series label",
        "color": "#hex_color"
      }
    ],
    "stacked": false,
    "horizontal": false,
    "show_data_labels": true,
    "legend": {
      "show": true,
      "position": "top"
    }
  }
}

IMPORTANT GUIDELINES:
1. Write valid ${databaseType} SQL syntax
2. Use appropriate column aliases that are clear and descriptive
3. For charts, ensure the query returns data suitable for visualization:
   - For bar/line charts: one column for labels, one or more for values
   - For pie/doughnut: one column for labels, one for values
   - For counter: single value result
4. Choose chart_type based on the data characteristics:
   - bar: comparisons between categories
   - line: trends over time
   - pie/doughnut: parts of a whole (percentages)
   - polarArea: similar to pie but with equal angles
5. Use meaningful colors from this palette: #3366CC, #DC3912, #FF9900, #109618, #990099, #0099C6, #DD4477, #66AA00
6. Set widget_options.label_column to the column that should be used for labels
7. For single value series, use value_column directly
8. For multiple series, use the series array

Respond ONLY with the JSON object, no additional text or explanation.`;
	}

	private parseAIResponse(aiResponse: string): AIGeneratedWidgetResponse {
		try {
			const cleanedResponse = cleanAIJsonResponse(aiResponse);
			const parsed = JSON.parse(cleanedResponse) as AIGeneratedWidgetResponse;

			if (!parsed.name || !parsed.query_text || !parsed.widget_type) {
				throw new Error('Missing required fields in AI response');
			}

			return parsed;
		} catch (error) {
			console.error('Error parsing AI response:', error.message);
			console.error('AI Response:', aiResponse);
			throw new BadRequestException(
				'Failed to generate widget configuration from AI. Please try again with a different description.',
			);
		}
	}

	private async validateAndRefineQueryWithExplain(
		dao: IDataAccessObject | IDataAccessObjectAgent,
		generatedWidget: AIGeneratedWidgetResponse,
		tableInfo: TableInfo,
		connectionType: ConnectionTypesEnum,
		chartDescription: string,
	): Promise<AIGeneratedWidgetResponse> {
		if (!EXPLAIN_SUPPORTED_TYPES.has(connectionType)) {
			return generatedWidget;
		}

		let currentQuery = generatedWidget.query_text;

		for (let iteration = 0; iteration < MAX_FEEDBACK_ITERATIONS; iteration++) {
			const explainResult = await this.runExplainQuery(dao, currentQuery, tableInfo.table_name);

			const correctionPrompt = this.buildQueryCorrectionPrompt(
				currentQuery,
				explainResult.success ? explainResult.result : explainResult.error,
				!explainResult.success,
				tableInfo,
				connectionType,
				chartDescription,
			);

			const aiResponse = await this.aiCoreService.completeWithProvider(AIProviderType.BEDROCK, correctionPrompt, {
				temperature: 0.2,
			});

			const correctedQuery = this.cleanQueryResponse(aiResponse);

			validateQuerySafety(correctedQuery, connectionType);

			if (this.normalizeWhitespace(correctedQuery) === this.normalizeWhitespace(currentQuery)) {
				this.logger.log(`Query accepted by AI without changes after EXPLAIN (iteration ${iteration + 1})`);
				break;
			}

			this.logger.log(`Query corrected by AI after EXPLAIN (iteration ${iteration + 1})`);
			currentQuery = correctedQuery;

			if (explainResult.success) {
				break;
			}
		}

		return { ...generatedWidget, query_text: currentQuery };
	}

	private async runExplainQuery(
		dao: IDataAccessObject | IDataAccessObjectAgent,
		query: string,
		tableName: string,
	): Promise<{ success: boolean; result?: string; error?: string }> {
		try {
			const explainQuery = `EXPLAIN ${query.replace(/;\s*$/, '')}`;
			const result = await (dao as IDataAccessObject).executeRawQuery(explainQuery, tableName);
			return { success: true, result: JSON.stringify(result, null, 2) };
		} catch (error) {
			return { success: false, error: error.message };
		}
	}

	private buildQueryCorrectionPrompt(
		currentQuery: string,
		explainResultOrError: string,
		isError: boolean,
		tableInfo: TableInfo,
		connectionType: ConnectionTypesEnum,
		chartDescription: string,
	): string {
		const schemaDescription = `Table: ${tableInfo.table_name}\n  Columns:\n${tableInfo.columns
			.map((col) => `    - ${col.name}: ${col.type}${col.nullable ? ' (nullable)' : ''}`)
			.join('\n')}`;

		const feedbackSection = isError
			? `The query FAILED with the following error:\n${explainResultOrError}\n\nPlease fix the query to resolve this error.`
			: `The EXPLAIN output for the query is:\n${explainResultOrError}\n\nReview the execution plan. If the query has performance issues (full table scans on large datasets, inefficient joins, etc.), optimize it. If the query is already acceptable, return it unchanged.`;

		return `You are a database query optimization assistant. A SQL query was generated and needs validation.

DATABASE TYPE: ${connectionType}

DATABASE SCHEMA:
${schemaDescription}

ORIGINAL USER REQUEST:
"${chartDescription}"

CURRENT QUERY:
${currentQuery}

${feedbackSection}

IMPORTANT:
- Preserve the same column aliases used in the original query.
- Write valid ${connectionType} SQL syntax.
- Return ONLY the SQL query, no explanations, no markdown, no JSON wrapping.`;
	}

	private cleanQueryResponse(aiResponse: string): string {
		return aiResponse
			.trim()
			.replace(/^```[a-zA-Z]*\n?/, '')
			.replace(/```\s*$/, '')
			.trim();
	}

	private normalizeWhitespace(query: string): string {
		return query.replace(/\s+/g, ' ').trim();
	}

	private mapWidgetType(type: string): DashboardWidgetTypeEnum {
		switch (type) {
			case 'chart':
				return DashboardWidgetTypeEnum.Chart;
			case 'table':
				return DashboardWidgetTypeEnum.Table;
			case 'counter':
				return DashboardWidgetTypeEnum.Counter;
			case 'text':
				return DashboardWidgetTypeEnum.Text;
			default:
				return DashboardWidgetTypeEnum.Chart;
		}
	}
}
