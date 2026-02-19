import { BadRequestException, Inject, Injectable, NotFoundException, Scope } from '@nestjs/common';
import { getDataAccessObject } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/create-data-access-object.js';
import { ConnectionTypesEnum } from '@rocketadmin/shared-code/dist/src/shared/enums/connection-types-enum.js';
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

@Injectable({ scope: Scope.REQUEST })
export class GeneratePanelPositionWithAiUseCase
	extends AbstractUseCase<GeneratePanelPositionWithAiDs, GeneratedPanelWithPositionDto>
	implements IGeneratePanelPositionWithAi
{
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

		let tableInfo: {
			table_name: string;
			columns: Array<{ name: string; type: string; nullable: boolean }>;
		};

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

		return {
			name: name || generatedWidget.name,
			description: generatedWidget.description || null,
			widget_type: this.mapWidgetType(generatedWidget.widget_type),
			chart_type: generatedWidget.chart_type || null,
			widget_options: generatedWidget.widget_options
				? (generatedWidget.widget_options as unknown as Record<string, unknown>)
				: null,
			query_text: generatedWidget.query_text,
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
