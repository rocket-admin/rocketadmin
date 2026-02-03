import { Injectable } from '@nestjs/common';
import { AICoreService, AIProviderType, cleanAIJsonResponse } from '../../ai-core/index.js';
import { QueryOrderingEnum } from '../../enums/query-ordering.enum.js';
import { WidgetTypeEnum } from '../../enums/widget-type.enum.js';
import { checkFieldAutoincrement } from '../../helpers/check-field-autoincrement.js';
import { TableSettingsEntity } from '../table-settings/common-table-settings/table-settings.entity.js';
import { TableWidgetEntity } from '../widget/table-widget.entity.js';
import { TableInformation } from './ai-data-entities/types/ai-module-types.js';

interface AIGeneratedWidgetParams {
	options?: Array<{ value: string; label: string; background_color?: string }>;
	allow_null?: boolean;
	unit?: string;
	threshold_min?: number;
	threshold_max?: number;
	height?: number;
	prefix?: string;
	encrypt?: boolean;
	algorithm?: string;
	min?: number;
	max?: number;
	step?: number;
	formatDistanceWithinHours?: number;
	language?: string;
	rows?: number;
	invert_colors?: boolean;
	validate?: string;
	regex?: string;
	type?: string;
	format?: string;
	show_flag?: boolean;
	preferred_countries?: string[];
	enable_placeholder?: boolean;
	phone_validation?: boolean;
	version?: string;
	namespace?: string;
	name?: string;
}

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
		widget_params?: AIGeneratedWidgetParams;
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

PASSWORD WIDGET:
- Use for: password, secret, hash columns
- REQUIRED params: {"encrypt": true, "algorithm": "bcrypt"}
- Algorithms: sha1, sha3, sha224, sha256, sha512, sha384, bcrypt (recommended), scrypt, argon2, pbkdf2
- Detect existing hash by pattern:
  * bcrypt: starts with "$2a$", "$2b$", or "$2y$" (60 chars)
  * argon2: starts with "$argon2"
  * scrypt: starts with "$scrypt$"
  * pbkdf2: starts with "$pbkdf2"
  * sha1: 40 hex characters
  * sha256: 64 hex characters (most common)
  * sha512: 128 hex characters

BOOLEAN WIDGET:
- Use for: boolean, bit, tinyint(1) columns, is_*, has_*, can_* columns
- Params: {"allow_null": false, "invert_colors": false}

DATE/TIME WIDGETS:
- Date: for date columns (params: {"formatDistanceWithinHours": 24} - shows "2 hours ago" for recent)
- Time: for time-only columns (no params needed)
- DateTime: for datetime/timestamp columns (params: {"formatDistanceWithinHours": 24})

TEXT WIDGETS:
- String: for short text (name, title, email) - params: {"validate": "isEmail"} for email validation
  Validators: isEmail, isURL, isUUID, isAlpha, isNumeric, isMobilePhone, isPostalCode, isCreditCard
- Textarea: for long text (description, content, bio) - params: {"rows": 5}
- JSON: for JSON/JSONB columns (no params needed)
- Code: for code/script columns - params: {"language": "html|css|typescript|yaml|markdown|sql"}
- Readonly: for auto-generated, computed fields (no params needed)

NUMBER WIDGET:
- Use for: int, decimal, float columns
- Params: {"unit": "bytes|meters|seconds|kg", "threshold_min": 0, "threshold_max": 1000}
- Unit examples: bytes, KB, MB, meters, km, seconds, minutes, kg, USD

SELECT WIDGET:
- Use for: status, type, category columns with known/limited values
- REQUIRED params: {"allow_null": true, "options": [{"value": "db_value", "label": "Display Label", "background_color": "#hex"}]}
- Infer options from column name (status: active/inactive, type: user/admin, priority: low/medium/high)

RANGE WIDGET:
- Use for: rating, progress, percentage columns
- Params: {"min": 0, "max": 100, "step": 1}

UUID WIDGET:
- Use for: uuid columns
- Params: {"version": "v4"} - versions: v1, v3, v4 (default), v5, v7

IMAGE WIDGET:
- Use for: avatar, photo, image_url, thumbnail columns
- Params: {"height": 100, "prefix": "https://cdn.example.com/"}

FILE WIDGET:
- Use for: file_path, document, attachment columns
- Params: {"type": "file|hex|base64"}

URL WIDGET:
- Use for: website, link, url columns
- Params: {"prefix": "https://"} if values don't include protocol

PHONE WIDGET:
- Use for: phone, mobile, telephone columns
- Params: {"preferred_countries": ["US", "GB"], "phone_validation": true}

COUNTRY WIDGET:
- Use for: country, country_code columns
- Params: {"show_flag": true, "allow_null": false}

COLOR WIDGET:
- Use for: color, hex_color columns
- Params: {"format": "hex_hash"} - formats: hex, hex_hash, rgb, hsl

TIMEZONE WIDGET:
- Use for: timezone, tz columns
- Params: {"allow_null": false}

FOREIGN_KEY WIDGET:
- Use ONLY for columns that reference another table but are NOT detected as foreign keys
- Skip if foreign key is already detected in table structure
- Params: {"column_name": "user_id", "referenced_table_name": "users", "referenced_column_name": "id"}

WIDGET SELECTION RULES:
1. Match widget type to column data type AND column name semantics
2. For password/hash columns: Always use Password with encrypt:true and detect algorithm from hash pattern
3. For status/type/category columns: Use Select with sensible options inferred from column name
4. For columns ending in _id that aren't foreign keys: Consider Foreign_key widget
5. For columns named email, phone, url, etc.: Use specialized widgets (String with isEmail validator, Phone, URL)
6. For auto_increment or primary key columns: Use Readonly
7. Provide widget_params only when the widget type benefits from configuration

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
          "field_name": "id",
          "widget_type": "Readonly",
          "widget_params": {},
          "name": "ID",
          "description": "Unique identifier"
        },
        {
          "field_name": "email",
          "widget_type": "String",
          "widget_params": {"validate": "isEmail"},
          "name": "Email Address",
          "description": "User email for login and communication"
        },
        {
          "field_name": "password_hash",
          "widget_type": "Password",
          "widget_params": {"encrypt": true, "algorithm": "bcrypt"},
          "name": "Password",
          "description": "Encrypted user password"
        },
        {
          "field_name": "status",
          "widget_type": "Select",
          "widget_params": {"options": [{"value": "active", "label": "Active"}, {"value": "inactive", "label": "Inactive"}], "allow_null": true},
          "name": "Status",
          "description": "Current status of the record"
        }
      ]
    }
  ]
}

IMPORTANT: 
- For each widget, include appropriate widget_params based on the column name, type, and semantics. Use empty {} for widgets that don't need special configuration.
- Output ONLY valid JSON. Do NOT include any comments (no // or /* */ comments) in the JSON output.
- All widget_params must be valid JSON objects without any comments or explanatory text.`;
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
					const widgetType = this.mapWidgetType(widgetData.widget_type);
					if (!widgetType || widgetType === WidgetTypeEnum.Foreign_key) {
						return null;
					}
					const widget = new TableWidgetEntity();
					widget.field_name = widgetData.field_name;
					widget.widget_type = widgetType;
					widget.name = widgetData.name;
					widget.description = widgetData.description;
					if (widgetData.widget_params && Object.keys(widgetData.widget_params).length > 0) {
						widget.widget_params = JSON.stringify(widgetData.widget_params);
					}
					return widget;
				})
				.filter((w): w is TableWidgetEntity => w !== null);

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
