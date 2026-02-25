import { BadRequestException, Inject, Injectable, Logger, NotFoundException, Scope } from '@nestjs/common';
import { getDataAccessObject } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/create-data-access-object.js';
import { ConnectionTypesEnum } from '@rocketadmin/shared-code/dist/src/shared/enums/connection-types-enum.js';
import { IDataAccessObject } from '@rocketadmin/shared-code/dist/src/shared/interfaces/data-access-object.interface.js';
import { IDataAccessObjectAgent } from '@rocketadmin/shared-code/dist/src/shared/interfaces/data-access-object-agent.interface.js';
import {
	AICoreService,
	AIProviderType,
	AIToolCall,
	AIToolDefinition,
	cleanAIJsonResponse,
	createDashboardGenerationTools,
	encodeError,
	encodeToToon,
	MessageBuilder,
} from '../../../../ai-core/index.js';
import AbstractUseCase from '../../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../../common/data-injection.tokens.js';
import { DashboardWidgetTypeEnum } from '../../../../enums/dashboard-widget-type.enum.js';
import { Messages } from '../../../../exceptions/text/messages.js';
import { isConnectionTypeAgent } from '../../../../helpers/is-connection-entity-agent.js';
import { DashboardEntity } from '../../dashboard/dashboard.entity.js';
import { PanelEntity } from '../../panel/panel.entity.js';
import { validateQuerySafety } from '../../panel/utils/check-query-is-safe.util.js';
import { GenerateTableDashboardWithAiDs } from '../data-structures/generate-table-dashboard-with-ai.ds.js';
import { GeneratedPanelWithPositionDto } from '../dto/generated-panel-with-position.dto.js';
import { PanelPositionEntity } from '../panel-position.entity.js';
import { IGenerateTableDashboardWithAi } from './panel-position-use-cases.interface.js';

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

interface AIDashboardResponse {
	dashboard_name: string;
	dashboard_description: string;
	panels: AIGeneratedPanelResponse[];
}

const MAX_TOOL_ITERATIONS = 10;
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

const MAX_FEEDBACK_ITERATIONS = 3;

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
		const { connectionId, masterPassword, userId, max_panels, dashboard_name } = inputData;

		const maxPanels = max_panels ?? DEFAULT_MAX_PANELS;

		const foundConnection = await this._dbContext.connectionRepository.findAndDecryptConnection(
			connectionId,
			masterPassword,
		);

		if (!foundConnection) {
			throw new NotFoundException(Messages.CONNECTION_NOT_FOUND);
		}

		const dao = getDataAccessObject(foundConnection);

		let userEmail: string;
		if (isConnectionTypeAgent(foundConnection.type)) {
			userEmail = await this._dbContext.userRepository.getUserEmailOrReturnNull(userId);
		}

		const tools = createDashboardGenerationTools();

		const systemPrompt = this.buildDashboardSystemPrompt(foundConnection.type as ConnectionTypesEnum, maxPanels);

		const messages = new MessageBuilder()
			.system(systemPrompt)
			.human(
				`Analyze the database and generate a dashboard with up to ${maxPanels} panels. ` +
					`Start by listing the available tables, then inspect the ones that look most interesting for analytics. ` +
					`Generate diverse and meaningful visualizations.`,
			)
			.build();

		const dashboardResponse = await this.runToolLoop(messages, tools, dao, userEmail);

		const parsedDashboard = this.parseDashboardResponse(dashboardResponse);

		const effectiveDashboardName = dashboard_name || parsedDashboard.dashboard_name || 'AI Generated Dashboard';

		const validPanels: GeneratedPanelWithPositionDto[] = [];

		for (let i = 0; i < parsedDashboard.panels.length && validPanels.length < maxPanels; i++) {
			const panel = parsedDashboard.panels[i];
			try {
				validateQuerySafety(panel.query_text, foundConnection.type as ConnectionTypesEnum);

				const refinedPanel = await this.validateAndRefineQueryWithExplain(
					dao,
					panel,
					foundConnection.type as ConnectionTypesEnum,
				);

				const index = validPanels.length;
				const row = Math.floor(index / PANELS_PER_ROW);
				const col = index % PANELS_PER_ROW;

				validPanels.push({
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
				});
			} catch (error) {
				this.logger.warn(`Panel "${panel.name}" skipped: ${error.message}`);
			}
		}

		if (validPanels.length === 0) {
			throw new BadRequestException('Failed to generate any valid panels. Please try again.');
		}

		const dashboardEntity = new DashboardEntity();
		dashboardEntity.name = effectiveDashboardName;
		dashboardEntity.description = parsedDashboard.dashboard_description || null;
		dashboardEntity.connection_id = connectionId;
		const savedDashboard = await this._dbContext.dashboardRepository.saveDashboard(dashboardEntity);

		for (const panel of validPanels) {
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

	private buildDashboardSystemPrompt(databaseType: ConnectionTypesEnum, maxPanels: number): string {
		return `You are a database analytics assistant that generates dashboards. You have access to two tools: getTablesList and getTableStructure. You do NOT have the ability to execute queries.

DATABASE TYPE: ${databaseType}

YOUR WORKFLOW:
1. Call getTablesList to see all available tables
2. Call getTableStructure for tables that look most interesting for analytics
3. Based on the table schemas, generate a complete dashboard with up to ${maxPanels} panels

CRITICAL: Your final response MUST be a raw JSON object only — no explanations, no markdown, no code fences, no text before or after. Just the JSON object in this format:
{
  "dashboard_name": "Descriptive name for the dashboard (max 100 chars)",
  "dashboard_description": "Brief description of what this dashboard shows",
  "panels": [
    {
      "name": "Short descriptive name for the panel (max 50 chars)",
      "description": "Brief description of what the panel shows",
      "query_text": "SELECT query that returns data for the visualization",
      "panel_type": "chart" | "table" | "counter" | "text",
      "chart_type": "bar" | "line" | "pie" | "doughnut" | "polarArea",
      "panel_options": {
        "label_column": "column name for labels/categories (x-axis)",
        "value_column": "column name for values (y-axis) - use for single series",
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
  ]
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
6. Include a mix of panel types (counters, charts, tables) for variety
7. Generate exactly ${maxPanels} panels
8. You may use multiple tables in queries (JOINs) if they are related
9. Your final response must start with { and end with } — no text, no markdown, no explanation`;
	}

	private async runToolLoop(
		messages: ReturnType<MessageBuilder['build']>,
		tools: AIToolDefinition[],
		dao: IDataAccessObject | IDataAccessObjectAgent,
		userEmail: string,
	): Promise<string> {
		let currentMessages = [...messages];
		let depth = 0;

		while (depth < MAX_TOOL_ITERATIONS) {
			const stream = await this.aiCoreService.streamChatWithToolsAndProvider(
				AIProviderType.BEDROCK,
				currentMessages,
				tools,
				{ temperature: 0.4 },
			);

			let accumulatedContent = '';
			const pendingToolCalls: AIToolCall[] = [];

			for await (const chunk of stream) {
				if (chunk.type === 'text' && chunk.content) {
					accumulatedContent += chunk.content;
				}
				if (chunk.type === 'tool_call' && chunk.toolCall) {
					pendingToolCalls.push(chunk.toolCall);
				}
			}

			this.logger.log(
				`Tool loop iteration ${depth + 1}: toolCalls=${pendingToolCalls.map((tc) => tc.name).join(', ') || 'none'}, ` +
					`contentLength=${accumulatedContent.length}`,
			);

			if (pendingToolCalls.length === 0) {
				return accumulatedContent;
			}

			const toolResults = await this.executeToolCalls(pendingToolCalls, dao, userEmail);

			const continuationBuilder = MessageBuilder.fromMessages(currentMessages);
			continuationBuilder.ai(accumulatedContent, pendingToolCalls);
			for (const tr of toolResults) {
				continuationBuilder.toolResult(tr.toolCallId, tr.result);
			}
			currentMessages = continuationBuilder.build();

			depth++;
		}

		throw new BadRequestException('AI tool loop exceeded maximum iterations. Please try again.');
	}

	private async executeToolCalls(
		toolCalls: AIToolCall[],
		dao: IDataAccessObject | IDataAccessObjectAgent,
		userEmail: string,
	): Promise<Array<{ toolCallId: string; result: string }>> {
		const results: Array<{ toolCallId: string; result: string }> = [];

		for (const toolCall of toolCalls) {
			let result: string;

			try {
				switch (toolCall.name) {
					case 'getTablesList': {
						const tables = await dao.getTablesFromDB(userEmail);
						result = encodeToToon(tables);
						break;
					}

					case 'getTableStructure': {
						const tableName = toolCall.arguments.tableName as string;
						if (!tableName) {
							throw new Error('Missing required argument "tableName"');
						}
						const structure = await dao.getTableStructure(tableName, userEmail);
						result = encodeToToon({
							tableName,
							columns: structure.map((col) => ({
								name: col.column_name,
								type: col.data_type,
								nullable: col.allow_null,
							})),
						});
						break;
					}

					default:
						result = encodeError({ error: `Unknown tool: ${toolCall.name}` });
				}
			} catch (error) {
				result = encodeError({ error: error.message });
			}

			results.push({ toolCallId: toolCall.id, result });
		}

		return results;
	}

	private extractJsonFromResponse(response: string): string {
		const jsonBlockMatch = response.match(/```(?:json)?\s*\n?([\s\S]*?)```/);
		if (jsonBlockMatch) {
			return jsonBlockMatch[1].trim();
		}

		const firstBrace = response.indexOf('{');
		if (firstBrace !== -1) {
			return response.slice(firstBrace);
		}

		return response;
	}

	private parseDashboardResponse(aiResponse: string): AIDashboardResponse {
		try {
			const extracted = this.extractJsonFromResponse(aiResponse);
			const cleanedResponse = cleanAIJsonResponse(extracted);
			const parsed = JSON.parse(cleanedResponse) as AIDashboardResponse;

			if (!parsed.panels || !Array.isArray(parsed.panels) || parsed.panels.length === 0) {
				throw new Error('Missing or empty panels array in AI response');
			}

			for (const panel of parsed.panels) {
				if (!panel.name || !panel.query_text || !panel.panel_type) {
					throw new Error('Panel missing required fields (name, query_text, panel_type)');
				}
			}

			return parsed;
		} catch (error) {
			this.logger.error('Error parsing dashboard AI response:', error.message);
			throw new BadRequestException('Failed to generate dashboard from AI. Please try again.');
		}
	}

	private async validateAndRefineQueryWithExplain(
		dao: IDataAccessObject | IDataAccessObjectAgent,
		generatedPanel: AIGeneratedPanelResponse,
		connectionType: ConnectionTypesEnum,
	): Promise<AIGeneratedPanelResponse> {
		if (!EXPLAIN_SUPPORTED_TYPES.has(connectionType)) {
			return generatedPanel;
		}

		let currentQuery = generatedPanel.query_text;

		for (let iteration = 0; iteration < MAX_FEEDBACK_ITERATIONS; iteration++) {
			const explainResult = await this.runExplainQuery(dao, currentQuery);

			const correctionPrompt = this.buildQueryCorrectionPrompt(
				currentQuery,
				explainResult.success ? explainResult.result : explainResult.error,
				!explainResult.success,
				connectionType,
				generatedPanel.name,
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
	): Promise<{ success: boolean; result?: string; error?: string }> {
		try {
			const explainQuery = `EXPLAIN ${query.replace(/;\s*$/, '')}`;
			const result = await (dao as IDataAccessObject).executeRawQuery(explainQuery, '');
			return { success: true, result: JSON.stringify(result, null, 2) };
		} catch (error) {
			return { success: false, error: error.message };
		}
	}

	private buildQueryCorrectionPrompt(
		currentQuery: string,
		explainResultOrError: string,
		isError: boolean,
		connectionType: ConnectionTypesEnum,
		panelName: string,
	): string {
		const feedbackSection = isError
			? `The query FAILED with the following error:\n${explainResultOrError}\n\nPlease fix the query to resolve this error.`
			: `The EXPLAIN output for the query is:\n${explainResultOrError}\n\nReview the execution plan. If the query has performance issues (full table scans on large datasets, inefficient joins, etc.), optimize it if possible. If the query is already acceptable, return it unchanged.`;

		return `You are a database query optimization assistant. A SQL query was generated and needs validation.

DATABASE TYPE: ${connectionType}

PANEL NAME: "${panelName}"

CURRENT QUERY:
${currentQuery}

${feedbackSection}

Respond with SQL only. Preserve column aliases. Valid ${connectionType} syntax.`;
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
