import { Injectable } from '@nestjs/common';
import { WidgetTypeEnum } from '../../enums/widget-type.enum.js';
import { checkFieldAutoincrement } from '../../helpers/check-field-autoincrement.js';
import { TableWidgetEntity } from '../widget/table-widget.entity.js';
import { TableInformation } from './ai-data-entities/types/ai-module-types.js';
import { AmazonBedrockAiProvider } from './amazon-bedrock/amazon-bedrock.ai.provider.js';
import { TableSettingsEntity } from '../table-settings/common-table-settings/table-settings.entity.js';

interface AIGeneratedTableSettings {
	table_name: string;
	display_name: string;
	search_fields: string[];
	readonly_fields: string[];
	columns_view: string[];
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

@Injectable()
export class AiService {
	constructor(protected readonly aiProvider: AmazonBedrockAiProvider) {}

	public async generateNewTableSettingsWithAI(
		tablesInformation: Array<TableInformation>,
	): Promise<Array<TableSettingsEntity>> {
		const prompt = this.buildPrompt(tablesInformation);
		const aiResponse = await this.aiProvider.generateResponse(prompt);
		const parsedResponse = this.parseAIResponse(aiResponse);
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
5. widgets: For each column, suggest the best widget type from: ${widgetTypes}

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

	private parseAIResponse(aiResponse: string): AIResponse {
		let cleanedResponse = aiResponse.trim();
		if (cleanedResponse.startsWith('```json')) {
			cleanedResponse = cleanedResponse.slice(7);
		} else if (cleanedResponse.startsWith('```')) {
			cleanedResponse = cleanedResponse.slice(3);
		}
		if (cleanedResponse.endsWith('```')) {
			cleanedResponse = cleanedResponse.slice(0, -3);
		}
		cleanedResponse = cleanedResponse.trim();

		try {
			return JSON.parse(cleanedResponse) as AIResponse;
		} catch (error) {
			throw new Error(`Failed to parse AI response: ${error.message}`);
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
