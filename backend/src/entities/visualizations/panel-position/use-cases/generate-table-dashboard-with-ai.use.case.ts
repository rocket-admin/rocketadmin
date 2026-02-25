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
import { GenerateTableDashboardWithAiDs } from '../data-structures/generate-table-dashboard-with-ai.ds.js';
import { GeneratedPanelWithPositionDto } from '../dto/generated-panel-with-position.dto.js';
import { IGenerateTableDashboardWithAi } from './panel-position-use-cases.interface.js';
import { validateQuerySafety } from '../../panel/utils/check-query-is-safe.util.js';
import { DashboardEntity } from '../../dashboard/dashboard.entity.js';
import { PanelEntity } from '../../panel/panel.entity.js';
import { PanelPositionEntity } from '../panel-position.entity.js';

interface AIGeneratedPanelResponse {
	name: string;
	description: string;
	query_text: string;
	panel_type: 'chart' | 'table' | 'counter' | 'text';
	chart_type?: 'bar' | 'line' | 'pie' | 'doughnut' | 'polarArea';
	panel_options?: {
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

interface AISuggestedChart {
	chart_description: string;
	suggested_panel_type: string;
	suggested_chart_type?: string;
}

interface AIDashboardSuggestion {
	dashboard_name: string;
	dashboard_description: string;
	charts: AISuggestedChart[];
}

const MAX_FEEDBACK_ITERATIONS = 3;
const DEFAULT_MAX_PANELS = 6;
const PANEL_WIDTH = 6;
const PANEL_HEIGHT = 4;
const PANELS_PER_ROW = 2;

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
export class GenerateTableDashboardWithAiUseCase
	extends AbstractUseCase<GenerateTableDashboardWithAiDs, { success: boolean }>
	implements IGenerateTableDashboardWithAi
{
	private readonly logger = new Logger(GenerateTableDashboardWithAiUseCase.name);

	constructor(
		@Inject(BaseType.GLOBAL_DB_CONTEXT)
		protected _dbContext: IGlobalDatabaseContext,
		private readonly aiCoreService: AICoreService,
	) {
		super();
	}

	public async implementation(inputData: GenerateTableDashboardWithAiDs): Promise<{ success: boolean }> {
		const { connectionId, masterPassword, table_name, max_panels, dashboard_name } = inputData;

		const maxPanels = max_panels ?? DEFAULT_MAX_PANELS;

		const foundConnection = await this._dbContext.connectionRepository.findAndDecryptConnection(
			connectionId,
			masterPassword,
		);

		if (!foundConnection) {
			throw new NotFoundException(Messages.CONNECTION_NOT_FOUND);
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

		const suggestionPrompt = this.buildDashboardSuggestionPrompt(tableInfo, foundConnection.type, maxPanels);

		const suggestionResponse = await this.aiCoreService.completeWithProvider(AIProviderType.BEDROCK, suggestionPrompt, {
			temperature: 0.4,
		});

		const dashboardSuggestion = this.parseDashboardSuggestion(suggestionResponse);

		const effectiveDashboardName =
			dashboard_name || dashboardSuggestion.dashboard_name || `${table_name} Dashboard`;

		const panelPromises = dashboardSuggestion.charts.slice(0, maxPanels).map((chart, index) =>
			this.generateSinglePanel(chart, tableInfo, dao, foundConnection.type as ConnectionTypesEnum, connectionId, index),
		);

		const results = await Promise.allSettled(panelPromises);

		const panels: GeneratedPanelWithPositionDto[] = [];

		for (const result of results) {
			if (result.status === 'fulfilled') {
				panels.push(result.value);
			} else {
				this.logger.warn(`Panel generation failed: ${result.reason?.message || result.reason}`);
			}
		}

		if (panels.length === 0) {
			throw new BadRequestException('Failed to generate any panels for the table. Please try again.');
		}

		const dashboardEntity = new DashboardEntity();
		dashboardEntity.name = effectiveDashboardName;
		dashboardEntity.description = dashboardSuggestion.dashboard_description || null;
		dashboardEntity.connection_id = connectionId;
		const savedDashboard = await this._dbContext.dashboardRepository.saveDashboard(dashboardEntity);

		for (const panel of panels) {
			const panelEntity = new PanelEntity();
			panelEntity.name = panel.name;
			panelEntity.description = panel.description || null;
			panelEntity.panel_type = panel.panel_type;
			panelEntity.chart_type = panel.chart_type || null;
			panelEntity.panel_options = panel.panel_options ? (panel.panel_options as unknown as string) : null;
			panelEntity.query_text = panel.query_text;
			panelEntity.connection_id = connectionId;
			const savedPanel = await this._dbContext.panelRepository.save(panelEntity);

			const positionEntity = new PanelPositionEntity();
			positionEntity.position_x = panel.panel_position.position_x;
			positionEntity.position_y = panel.panel_position.position_y;
			positionEntity.width = panel.panel_position.width;
			positionEntity.height = panel.panel_position.height;
			positionEntity.dashboard_id = savedDashboard.id;
			positionEntity.query_id = savedPanel.id;
			await this._dbContext.panelPositionRepository.savePanelPosition(positionEntity);
		}

		return { success: true };
	}

	private buildDashboardSuggestionPrompt(tableInfo: TableInfo, databaseType: string, maxPanels: number): string {
		const schemaDescription = `Table: ${tableInfo.table_name}\n  Columns:\n${tableInfo.columns.map((col) => `    - ${col.name}: ${col.type}${col.nullable ? ' (nullable)' : ''}`).join('\n')}`;

		return `You are a database analytics assistant. Analyze the following table schema and suggest ${maxPanels} useful chart/panel visualizations that would provide meaningful insights.

DATABASE TYPE: ${databaseType}

DATABASE SCHEMA:
${schemaDescription}

Suggest diverse visualizations based on the column types:
- Numeric columns: counters (totals, averages), bar/line charts for distributions
- Date/timestamp columns: line charts for trends over time
- String/categorical columns: pie/doughnut charts for category distributions, bar charts for top N
- Boolean columns: pie charts for true/false distributions
- Combinations: group numeric data by categories or time periods

Generate a JSON response with the following structure:
{
  "dashboard_name": "Descriptive name for the dashboard (max 100 chars)",
  "dashboard_description": "Brief description of what this dashboard shows",
  "charts": [
    {
      "chart_description": "Detailed natural language description of what the chart should show, including specific columns, aggregations, and groupings to use",
      "suggested_panel_type": "chart" | "counter" | "table",
      "suggested_chart_type": "bar" | "line" | "pie" | "doughnut" | "polarArea"
    }
  ]
}

IMPORTANT GUIDELINES:
1. Suggest exactly ${maxPanels} charts
2. Each chart_description should be specific enough to generate a SQL query
3. Include a mix of panel types (counters, charts, tables) for variety
4. Reference actual column names from the schema
5. Consider which visualizations are most meaningful for the data types present
6. Avoid duplicate or overly similar visualizations

Respond ONLY with the JSON object, no additional text or explanation.`;
	}

	private parseDashboardSuggestion(aiResponse: string): AIDashboardSuggestion {
		try {
			const cleanedResponse = cleanAIJsonResponse(aiResponse);
			const parsed = JSON.parse(cleanedResponse) as AIDashboardSuggestion;

			if (!parsed.charts || !Array.isArray(parsed.charts) || parsed.charts.length === 0) {
				throw new Error('Missing or empty charts array in AI response');
			}

			return parsed;
		} catch (error) {
			this.logger.error('Error parsing dashboard suggestion AI response:', error.message);
			throw new BadRequestException(
				'Failed to generate dashboard suggestions from AI. Please try again.',
			);
		}
	}

	private async generateSinglePanel(
		chart: AISuggestedChart,
		tableInfo: TableInfo,
		dao: IDataAccessObject | IDataAccessObjectAgent,
		connectionType: ConnectionTypesEnum,
		connectionId: string,
		index: number,
	): Promise<GeneratedPanelWithPositionDto> {
		const prompt = this.buildPanelPrompt(chart.chart_description, tableInfo, connectionType);

		const aiResponse = await this.aiCoreService.completeWithProvider(AIProviderType.BEDROCK, prompt, {
			temperature: 0.3,
		});

		const generatedPanel = this.parseAIResponse(aiResponse);

		validateQuerySafety(generatedPanel.query_text, connectionType);

		const refinedPanel = await this.validateAndRefineQueryWithExplain(
			dao,
			generatedPanel,
			tableInfo,
			connectionType,
			chart.chart_description,
		);

		const row = Math.floor(index / PANELS_PER_ROW);
		const col = index % PANELS_PER_ROW;

		return {
			name: refinedPanel.name,
			description: refinedPanel.description || null,
			panel_type: this.mapPanelType(refinedPanel.panel_type),
			chart_type: refinedPanel.chart_type || null,
			panel_options: refinedPanel.panel_options
				? (refinedPanel.panel_options as unknown as Record<string, unknown>)
				: null,
			query_text: refinedPanel.query_text,
			connection_id: connectionId,
			panel_position: {
				position_x: col * PANEL_WIDTH,
				position_y: row * PANEL_HEIGHT,
				width: PANEL_WIDTH,
				height: PANEL_HEIGHT,
				dashboard_id: null,
			},
		};
	}

	private buildPanelPrompt(
		chartDescription: string,
		tableInfo: TableInfo,
		databaseType: string | ConnectionTypesEnum,
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
  "panel_type": "chart" | "table" | "counter" | "text",
  "chart_type": "bar" | "line" | "pie" | "doughnut" | "polarArea",
  "panel_options": {
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
6. Set panel_options.label_column to the column that should be used for labels
7. For single value series, use value_column directly
8. For multiple series, use the series array

Respond ONLY with the JSON object, no additional text or explanation.`;
	}

	private parseAIResponse(aiResponse: string): AIGeneratedPanelResponse {
		try {
			const cleanedResponse = cleanAIJsonResponse(aiResponse);
			const parsed = JSON.parse(cleanedResponse) as AIGeneratedPanelResponse;

			if (!parsed.name || !parsed.query_text || !parsed.panel_type) {
				throw new Error('Missing required fields in AI response');
			}

			return parsed;
		} catch (error) {
			this.logger.error('Error parsing AI response:', error.message);
			throw new BadRequestException(
				'Failed to generate panel configuration from AI. Please try again with a different description.',
			);
		}
	}

	private async validateAndRefineQueryWithExplain(
		dao: IDataAccessObject | IDataAccessObjectAgent,
		generatedPanel: AIGeneratedPanelResponse,
		tableInfo: TableInfo,
		connectionType: ConnectionTypesEnum,
		chartDescription: string,
	): Promise<AIGeneratedPanelResponse> {
		if (!EXPLAIN_SUPPORTED_TYPES.has(connectionType)) {
			return generatedPanel;
		}

		let currentQuery = generatedPanel.query_text;

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

		return { ...generatedPanel, query_text: currentQuery };
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
		const cleaned = aiResponse
			.trim()
			.replace(/^```[a-zA-Z]*\n?/, '')
			.replace(/```\s*$/, '')
			.trim();

		if (cleaned.startsWith('{')) {
			try {
				const parsed = JSON.parse(cleaned);
				if (parsed.query_text) {
					return parsed.query_text;
				}
			} catch {
				// Not valid JSON, return as-is
			}
		}

		return cleaned;
	}

	private normalizeWhitespace(query: string): string {
		return query.replace(/\s+/g, ' ').trim();
	}

	private mapPanelType(type: string): DashboardWidgetTypeEnum {
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
