import { Injectable } from '@nestjs/common';
import { AICoreService, AIProviderType, cleanAIJsonResponse } from '../../ai-core/index.js';
import { QueryOrderingEnum } from '../../enums/query-ordering.enum.js';
import { WidgetTypeEnum } from '../../enums/widget-type.enum.js';
import { checkFieldAutoincrement } from '../../helpers/check-field-autoincrement.js';
import { TableSettingsEntity } from '../table-settings/common-table-settings/table-settings.entity.js';
import { TableWidgetEntity } from '../widget/table-widget.entity.js';
import { TableInformation } from './ai-data-entities/types/ai-module-types.js';

interface AIGeneratedTableSettings {
	table_name: string;
	display_name: string;
	search_fields: string[];
	readonly_fields: string[];
	columns_view: string[];
	ordering: string;
	ordering_field: string;
	widgets: Array<{
		field_name: string;
		widget_type: string;
		name: string;
		description: string;
	}>;
}

interface AIResponse {
	tables: AIGeneratedTableSettings[];
}

const AI_BATCH_SIZE = 10;

@Injectable()
export class AiService {
	constructor(protected readonly aiCoreService: AICoreService) {}

	public async generateNewTableSettingsWithAI(
		tablesInformation: Array<TableInformation>,
	): Promise<Array<TableSettingsEntity>> {
		const allSettings: Array<TableSettingsEntity> = [];

		for (let i = 0; i < tablesInformation.length; i += AI_BATCH_SIZE) {
			const batch = tablesInformation.slice(i, i + AI_BATCH_SIZE);
			try {
				const batchSettings = await this.processTablesBatch(batch);
				allSettings.push(...batchSettings);
			} catch (error) {
				console.warn(`Batch processing failed, falling back to individual table processing: ${error.message}`);
				for (const tableInfo of batch) {
					try {
						const singleTableSettings = await this.processTablesBatch([tableInfo]);
						allSettings.push(...singleTableSettings);
					} catch (singleError) {
						console.error(`Error processing AI for table "${tableInfo.table_name}": ${singleError.message}`);
					}
				}
			}
		}

		return allSettings;
	}

	private async processTablesBatch(tablesInformation: Array<TableInformation>): Promise<Array<TableSettingsEntity>> {
		const prompt = this.buildPrompt(tablesInformation);
		const aiResponse = await this.aiCoreService.completeWithProvider(AIProviderType.BEDROCK, prompt, {
			temperature: 0.3,
		});
		const parsedResponse = this.parseAIResponse(aiResponse, tablesInformation);
		return this.buildTableSettingsEntities(parsedResponse, tablesInformation);
	}

	private buildPrompt(tablesInformation: Array<TableInformation>): string {
		const widgetTypes = Object.values(WidgetTypeEnum).join(', ');

		const tablesDescription = tablesInformation
			.map((table) => {
				const columns = table.structure
					.map(
						(col) =>
							`    - ${col.column_name}: ${col.data_type}${col.allow_null ? ' (nullable)' : ''}${checkFieldAutoincrement(col.column_default, col.extra) ? ' (auto_increment)' : ''}`,
					)
					.join('\n');
				const primaryKeys = table.primaryColumns.map((pk) => pk.column_name).join(', ');
				const foreignKeys = table.foreignKeys
					.map((fk) => `    - ${fk.column_name} -> ${fk.referenced_table_name}.${fk.referenced_column_name}`)
					.join('\n');

				return `
Table: ${table.table_name}
  Primary Keys: ${primaryKeys || 'none'}
  Columns:
${columns}
  Foreign Keys:
${foreignKeys || '    none'}`;
			})
			.join('\n\n');

		return `You are a database administration assistant. Analyze the following database tables and generate optimal settings for displaying and managing them in a web admin panel.

For each table, provide:
1. display_name: A human-readable name for the table
2. search_fields: Columns that should be searchable (text fields like name, email, title)
3. readonly_fields: Columns that should not be editable (like auto_increment, timestamps)
4. columns_view: All columns in preferred display order
5. ordering: Default sort order - either "ASC" or "DESC" (use "DESC" for tables with timestamps to show newest first)
6. ordering_field: Column name to sort by default (prefer created_at, updated_at, or primary key)
7. widgets: For each column, suggest the best widget type from: ${widgetTypes}

Available widget types and when to use them:
- Password: for password fields
- Boolean: for boolean/bit columns
- Date: for date columns
- Time: for time-only columns
- DateTime: for datetime/timestamp columns
- JSON: for JSON/JSONB columns
- Textarea: for long text fields (description, content, etc.)
- String: for short text fields (name, title, etc.)
- Readonly: for auto-generated fields
- Number: for numeric columns
- Select: for columns with limited options
- UUID: for UUID columns
- Enum: for enum columns
- Foreign_key: for foreign key columns
- File: for file path columns
- Image: for image URL columns
- URL: for URL columns
- Code: for code snippets
- Phone: for phone number columns
- Country: for country columns
- Color: for color columns (hex values)
- Range: for range values
- Timezone: for timezone columns

Database tables to analyze:
${tablesDescription}

Respond ONLY with valid JSON in this exact format (no markdown, no explanations):
{
  "tables": [
    {
      "table_name": "table_name",
      "display_name": "Human Readable Name",
      "search_fields": ["name", "email"],
      "readonly_fields": ["id", "created_at"],
      "columns_view": ["id", "name", "email", "created_at"],
      "ordering": "DESC",
      "ordering_field": "created_at",
      "widgets": [
        {
          "field_name": "column_name",
          "widget_type": "String",
          "name": "Column Display Name",
          "description": "Description of what this column contains"
        }
      ]
    }
  ]
}`;
	}

	private parseAIResponse(aiResponse: string, tablesInformation: Array<TableInformation>): AIResponse {
		const cleanedResponse = cleanAIJsonResponse(aiResponse);
		const tableNames = tablesInformation.map((t) => t.table_name);

		try {
			return JSON.parse(cleanedResponse) as AIResponse;
		} catch (error) {
			throw new Error(`Failed to parse AI response for tables [${tableNames.join(', ')}]: ${error.message}`);
		}
	}

	private buildTableSettingsEntities(
		aiResponse: AIResponse,
		tablesInformation: Array<TableInformation>,
	): Array<TableSettingsEntity> {
		return aiResponse.tables.map((tableSettings) => {
			const tableInfo = tablesInformation.find((t) => t.table_name === tableSettings.table_name);
			const validColumnNames = tableInfo?.structure.map((col) => col.column_name) || [];

			const settings = new TableSettingsEntity();
			settings.table_name = tableSettings.table_name;
			settings.display_name = tableSettings.display_name;
			settings.search_fields = this.filterValidColumns(tableSettings.search_fields, validColumnNames);
			settings.readonly_fields = this.filterValidColumns(tableSettings.readonly_fields, validColumnNames);
			settings.columns_view = this.filterValidColumns(tableSettings.columns_view, validColumnNames);
			settings.ordering = this.mapOrdering(tableSettings.ordering);
			settings.ordering_field = validColumnNames.includes(tableSettings.ordering_field)
				? tableSettings.ordering_field
				: null;
			settings.table_widgets = tableSettings.widgets
				.filter((w) => validColumnNames.includes(w.field_name))
				.map((widgetData) => {
					const widget = new TableWidgetEntity();
					widget.field_name = widgetData.field_name;
					widget.widget_type = this.mapWidgetType(widgetData.widget_type);
					widget.name = widgetData.name;
					widget.description = widgetData.description;
					return widget;
				});

			return settings;
		});
	}

	private filterValidColumns(columns: string[], validColumnNames: string[]): string[] {
		return columns?.filter((col) => validColumnNames.includes(col)) || [];
	}

	private mapOrdering(ordering: string): QueryOrderingEnum | null {
		if (ordering === 'ASC') return QueryOrderingEnum.ASC;
		if (ordering === 'DESC') return QueryOrderingEnum.DESC;
		return null;
	}

	private mapWidgetType(widgetType: string): WidgetTypeEnum | undefined {
		const widgetTypeMap = new Map<string, WidgetTypeEnum>([
			['Password', WidgetTypeEnum.Password],
			['Boolean', WidgetTypeEnum.Boolean],
			['Date', WidgetTypeEnum.Date],
			['Time', WidgetTypeEnum.Time],
			['DateTime', WidgetTypeEnum.DateTime],
			['JSON', WidgetTypeEnum.JSON],
			['Textarea', WidgetTypeEnum.Textarea],
			['String', WidgetTypeEnum.String],
			['Readonly', WidgetTypeEnum.Readonly],
			['Number', WidgetTypeEnum.Number],
			['Select', WidgetTypeEnum.Select],
			['UUID', WidgetTypeEnum.UUID],
			['Enum', WidgetTypeEnum.Enum],
			['Foreign_key', WidgetTypeEnum.Foreign_key],
			['File', WidgetTypeEnum.File],
			['Image', WidgetTypeEnum.Image],
			['URL', WidgetTypeEnum.URL],
			['Code', WidgetTypeEnum.Code],
			['Phone', WidgetTypeEnum.Phone],
			['Country', WidgetTypeEnum.Country],
			['Color', WidgetTypeEnum.Color],
			['Range', WidgetTypeEnum.Range],
			['Timezone', WidgetTypeEnum.Timezone],
		]);
		return widgetTypeMap.get(widgetType);
	}
}
