import { Inject, Injectable } from "@nestjs/common";
import { getDataAccessObject } from "@rocketadmin/shared-code/dist/src/data-access-layer/shared/create-data-access-object.js";
import { TableDS } from "@rocketadmin/shared-code/dist/src/data-access-layer/shared/data-structures/table.ds.js";
import { buildValidateTableSettingsDS } from "@rocketadmin/shared-code/dist/src/helpers/data-structures-builders/validate-table-settings-ds.builder.js";
import { IDataAccessObject } from "@rocketadmin/shared-code/dist/src/shared/interfaces/data-access-object.interface.js";
import { IDataAccessObjectAgent } from "@rocketadmin/shared-code/dist/src/shared/interfaces/data-access-object-agent.interface.js";
import * as Sentry from "@sentry/node";
import PQueue from "p-queue";
import { IGlobalDatabaseContext } from "../../common/application/global-database-context.interface.js";
import { BaseType } from "../../common/data-injection.tokens.js";
import { WidgetTypeEnum } from "../../enums/widget-type.enum.js";
import { isTest } from "../../helpers/app/is-test.js";
import { ValidationHelper } from "../../helpers/validators/validation-helper.js";
import { AiService } from "../ai/ai.service.js";
import { ConnectionEntity } from "../connection/connection.entity.js";
import { TableSettingsEntity } from "../table-settings/table-settings.entity.js";
import { buildEmptyTableSettings } from "../table-settings/utils/build-empty-table-settings.js";
import { buildNewTableSettingsEntity } from "../table-settings/utils/build-new-table-settings-entity.js";
import { TableWidgetEntity } from "../widget/table-widget.entity.js";

@Injectable()
export class SharedJobsService {
	constructor(
		@Inject(BaseType.GLOBAL_DB_CONTEXT)
		protected _dbContext: IGlobalDatabaseContext,
		private readonly aiService: AiService,
	) {}

	public async scanDatabaseAndCreateSettingsAndWidgetsWithAI(
		connection: ConnectionEntity,
	): Promise<void> {
		if (!connection || isTest()) {
			return;
		}
		try {
			const dao = getDataAccessObject(connection);
			const tables: Array<TableDS> = await dao.getTablesFromDB();
			const queue = new PQueue({ concurrency: 4 });
			const tablesInformation = await Promise.all(
				tables.map((table) =>
					queue.add(async () => {
						const structure = await dao.getTableStructure(
							table.tableName,
							null,
						);
						const primaryColumns = await dao.getTablePrimaryColumns(
							table.tableName,
							null,
						);
						const foreignKeys = await dao.getTableForeignKeys(
							table.tableName,
							null,
						);
						return {
							table_name: table.tableName,
							structure,
							primaryColumns,
							foreignKeys,
						};
					}),
				),
			);

			const generatedTableSettings =
				await this.aiService.generateNewTableSettingsWithAI(tablesInformation);

			const widgetsByTable = new Map<string, Array<TableWidgetEntity>>();
			for (const setting of generatedTableSettings) {
				if (setting.table_widgets && setting.table_widgets.length > 0) {
					widgetsByTable.set(setting.table_name, setting.table_widgets);
				}
			}

			const normalizedSettings = this.normalizeAISettings(
				generatedTableSettings,
				connection,
			);

			const validationQueue = new PQueue({ concurrency: 4 });
			const validatedSettings = await Promise.all(
				normalizedSettings.map((setting) =>
					validationQueue.add(async () => {
						const validateSettingsDS = buildValidateTableSettingsDS(setting);
						const errors = await dao.validateSettings(
							validateSettingsDS,
							setting.table_name,
							undefined,
						);
						if (errors.length > 0) {
							console.error(
								`Validation errors for table "${setting.table_name}":`,
								errors,
							);
							return null;
						}
						return setting;
					}),
				),
			);

			const settingsToSave = validatedSettings.filter(
				(setting) => setting !== null,
			);
			if (settingsToSave.length > 0) {
				const savedSettings =
					await this._dbContext.tableSettingsRepository.save(settingsToSave);
				const widgetsToSave: Array<TableWidgetEntity> = [];
				for (const savedSetting of savedSettings) {
					const widgets = widgetsByTable.get(savedSetting.table_name);
					if (widgets && widgets.length > 0) {
						for (const widget of widgets) {
							const widgetEntity = new TableWidgetEntity();
							widgetEntity.field_name = widget.field_name;
							widgetEntity.widget_type = widget.widget_type;
							widgetEntity.widget_params = widget.widget_params || null;
							widgetEntity.widget_options = widget.widget_options || null;
							widgetEntity.name = widget.name || null;
							widgetEntity.description = widget.description || null;
							widgetEntity.settings = savedSetting;
							widgetsToSave.push(widgetEntity);
						}
					}
				}

				if (widgetsToSave.length > 0) {
					await this._dbContext.tableWidgetsRepository.save(widgetsToSave);
				}
			}
		} catch (error) {
			Sentry.captureException(error);
		}
	}

	public async scanDatabaseAndCreateWidgets(
		connection: ConnectionEntity,
	): Promise<void> {
		if (!connection) {
			return;
		}
		try {
			const dao = getDataAccessObject(connection);
			const tables: Array<TableDS> = await dao.getTablesFromDB();
			const tableNames = tables.map((t) => t.tableName);
			const queue = new PQueue({ concurrency: 2 });

			for (const tableName of tableNames) {
				queue.add(async () => {
					try {
						await this.scanTableAndCreateWidgets(tableName, connection, dao);
					} catch (error) {
						console.error(
							`Error scanning table "${tableName}" in connection with id "${connection.id}": `,
							error,
						);
					}
				});
			}

			await queue.onIdle();
		} catch (error) {
			Sentry.captureException(error);
		}
	}

	private normalizeAISettings(
		aiSettings: Array<TableSettingsEntity>,
		connection: ConnectionEntity,
	): Array<TableSettingsEntity> {
		aiSettings.forEach((setting) => {
			delete setting.id;
			setting.connection_id = connection;
			delete setting.table_widgets;
		});
		return aiSettings;
	}

	private async scanTableAndCreateWidgets(
		tableName: string,
		connection: ConnectionEntity,
		dao: IDataAccessObject | IDataAccessObjectAgent,
	): Promise<void> {
		const { data } = await dao.getRowsFromTable(
			tableName,
			{} as any,
			1,
			10,
			null,
			null,
			null,
			null,
			null,
		);
		if (data && data.length > 0) {
			const columnNames: Set<string> = new Set();
			data.forEach((row) => {
				Object.keys(row).forEach((key) => columnNames.add(key));
			});

			const columnsArray = Array.from(columnNames);

			const widgetColumnNames = {
				telephone: new Set<string>(),
				uuid: new Set<string>(),
				countryCode: new Set<string>(),
				email: new Set<string>(),
				url: new Set<string>(),
				rgbColor: new Set<string>(),
				hexColor: new Set<string>(),
				hslColor: new Set<string>(),
			};

			for (const column of columnsArray) {
				const sampleValues = data
					// eslint-disable-next-line security/detect-object-injection
					.map((row) => row[column])
					.filter((value) => value !== null && value !== undefined)
					.slice(0, 10);

				if (sampleValues.length === 0) {
					continue;
				}

				switch (true) {
					case sampleValues.every((value) =>
						this.isValueTelephoneNumber(value),
					):
						widgetColumnNames.telephone.add(column);
						break;
					case sampleValues.every((value) => this.isValueUUID(value)):
						widgetColumnNames.uuid.add(column);
						break;
					case sampleValues.every((value) => this.isValueCountryCode(value)):
						widgetColumnNames.countryCode.add(column);
						break;
					case sampleValues.every((value) => this.isValueEmail(String(value))):
						widgetColumnNames.email.add(column);
						break;
					case sampleValues.every((value) => this.isValueURL(value)):
						widgetColumnNames.url.add(column);
						break;
					case sampleValues.every((value) => this.isValueRgbColor(value)):
						widgetColumnNames.rgbColor.add(column);
						break;
					case sampleValues.every((value) => this.isValueHexColor(value)):
						widgetColumnNames.hexColor.add(column);
						break;
					case sampleValues.every((value) => this.isHslColor(value)):
						widgetColumnNames.hslColor.add(column);
						break;
					default:
						break;
				}
			}

			const telephoneColumns = Array.from(widgetColumnNames.telephone);
			const uuidColumns = Array.from(widgetColumnNames.uuid);
			const countryCodeColumns = Array.from(widgetColumnNames.countryCode);
			const emailColumns = Array.from(widgetColumnNames.email);
			const urlColumns = Array.from(widgetColumnNames.url);
			const rgbColorColumns = Array.from(widgetColumnNames.rgbColor);
			const hexColorColumns = Array.from(widgetColumnNames.hexColor);
			const hslColorColumns = Array.from(widgetColumnNames.hslColor);

			const allColumns = [
				telephoneColumns,
				uuidColumns,
				countryCodeColumns,
				emailColumns,
				urlColumns,
				rgbColorColumns,
				hexColorColumns,
				hslColorColumns,
			];
			if (allColumns.every((columns) => columns.length === 0)) {
				return;
			}

			const newTableSettingsDS = buildEmptyTableSettings(
				connection.id,
				tableName,
			);
			const newTableSettings = buildNewTableSettingsEntity(
				newTableSettingsDS,
				connection,
			);
			const savedTableSettings =
				await this._dbContext.tableSettingsRepository.save(newTableSettings);

			if (telephoneColumns.length) {
				for (const column of telephoneColumns) {
					const newWidget = new TableWidgetEntity();
					newWidget.field_name = column;
					newWidget.widget_type = WidgetTypeEnum.Phone;
					newWidget.widget_options = null;
					newWidget.widget_params =
						'// Configure international phone number widget\n// example:\n{\n  "preferred_countries": ["US", "GB", "CA"],\n  "enable_placeholder": true,\n  "enable_auto_country_select": true,\n  "phone_validation": true,\n  "format": "international"\n}\n';
					newWidget.settings = savedTableSettings;
					await this._dbContext.tableWidgetsRepository.save(newWidget);
				}
			}
			if (uuidColumns.length) {
				for (const column of uuidColumns) {
					const newWidget = new TableWidgetEntity();
					newWidget.field_name = column;
					newWidget.widget_type = WidgetTypeEnum.UUID;
					newWidget.widget_options = null;
					newWidget.settings = savedTableSettings;
					await this._dbContext.tableWidgetsRepository.save(newWidget);
				}
			}
			if (countryCodeColumns.length) {
				for (const column of countryCodeColumns) {
					const newWidget = new TableWidgetEntity();
					newWidget.field_name = column;
					newWidget.widget_type = WidgetTypeEnum.Country;
					newWidget.widget_options = null;
					newWidget.widget_params =
						'// Configure country display options\n// Example:\n{\n  "show_flag": true,\n  "allow_null": false\n}\n';
					newWidget.settings = savedTableSettings;
					await this._dbContext.tableWidgetsRepository.save(newWidget);
				}
			}
			if (emailColumns.length) {
				for (const column of emailColumns) {
					const newWidget = new TableWidgetEntity();
					newWidget.field_name = column;
					newWidget.widget_type = WidgetTypeEnum.String;
					newWidget.widget_options = null;
					newWidget.widget_params =
						'// Optional validation for string values\n// validate: Any validator.js method (e.g., "isEmail", "isURL", "isUUID", "isJSON", "isAlpha", "isNumeric")\n// Full list: isEmail, isURL, isMACAddress, isIP, isIPRange, isFQDN, isBoolean, isIBAN, isBIC,\n// isAlpha, isAlphanumeric, isNumeric, isPort, isLowercase, isUppercase, isAscii, isBase64,\n// isHexadecimal, isHexColor, isRgbColor, isHSL, isMD5, isHash, isJWT, isJSON, isUUID,\n// isMongoId, isCreditCard, isISBN, isISSN, isMobilePhone, isPostalCode, isEthereumAddress,\n// isCurrency, isBtcAddress, isISO8601, isISO31661Alpha2, isISO31661Alpha3, isISO4217,\n// isDataURI, isMagnetURI, isMimeType, isLatLong, isSlug, isStrongPassword, isTaxID, isVAT\n// OR use "regex" with a regex parameter for custom pattern matching\n{\n  "validate": "isEmail",\n  "regex": null\n}';
					newWidget.settings = savedTableSettings;
					await this._dbContext.tableWidgetsRepository.save(newWidget);
				}
			}
			if (urlColumns.length) {
				for (const column of urlColumns) {
					const newWidget = new TableWidgetEntity();
					newWidget.field_name = column;
					newWidget.widget_type = WidgetTypeEnum.URL;
					newWidget.widget_options = null;
					newWidget.settings = savedTableSettings;
					await this._dbContext.tableWidgetsRepository.save(newWidget);
				}
			}
			if (rgbColorColumns.length) {
				for (const column of rgbColorColumns) {
					const newWidget = new TableWidgetEntity();
					newWidget.field_name = column;
					newWidget.widget_type = WidgetTypeEnum.Color;
					newWidget.widget_options =
						'// Optional: Specify output format for color values\n// Supported formats: "hex", "hex_hash" (default), "rgb", "hsl"\n// Example configuration:\n\n{\n  "format": "rgb"  // Will display colors as "#FF5733"\n}\n\n// Format options:\n// - "hex": Display as "FF5733" (no hash)\n// - "hex_hash": Display as "#FF5733" (default)\n// - "rgb": Display as "rgb(255, 87, 51)"\n// - "hsl": Display as "hsl(9, 100%, 60%)"';
					newWidget.settings = savedTableSettings;
					await this._dbContext.tableWidgetsRepository.save(newWidget);
				}
			}
			if (hexColorColumns.length) {
				for (const column of hexColorColumns) {
					const newWidget = new TableWidgetEntity();
					newWidget.field_name = column;
					newWidget.widget_type = WidgetTypeEnum.Color;
					newWidget.widget_options =
						'// Optional: Specify output format for color values\n// Supported formats: "hex", "hex_hash" (default), "rgb", "hsl"\n// Example configuration:\n\n{\n  "format": "hex_hash"  // Will display colors as "#FF5733"\n}\n\n// Format options:\n// - "hex": Display as "FF5733" (no hash)\n// - "hex_hash": Display as "#FF5733" (default)\n// - "rgb": Display as "rgb(255, 87, 51)"\n// - "hsl": Display as "hsl(9, 100%, 60%)"';
					newWidget.settings = savedTableSettings;
					await this._dbContext.tableWidgetsRepository.save(newWidget);
				}
			}
			if (hslColorColumns.length) {
				for (const column of hslColorColumns) {
					const newWidget = new TableWidgetEntity();
					newWidget.field_name = column;
					newWidget.widget_type = WidgetTypeEnum.Color;
					newWidget.widget_options =
						'// Optional: Specify output format for color values\n// Supported formats: "hex", "hex_hash" (default), "rgb", "hsl"\n// Example configuration:\n\n{\n  "format": "hsl"  // Will display colors as "#FF5733"\n}\n\n// Format options:\n// - "hex": Display as "FF5733" (no hash)\n// - "hex_hash": Display as "#FF5733" (default)\n// - "rgb": Display as "rgb(255, 87, 51)"\n// - "hsl": Display as "hsl(9, 100%, 60%)"';
					newWidget.settings = savedTableSettings;
					await this._dbContext.tableWidgetsRepository.save(newWidget);
				}
			}
		}
	}

	private isValueTelephoneNumber(value: unknown): boolean {
		if (typeof value !== "string") {
			return false;
		}
		const phoneRegex = /^\+\d{10,}$/;
		return phoneRegex.test(value) && ValidationHelper.isValidPhoneNumber(value);
	}

	private isValueRgbColor(value: unknown): boolean {
		if (typeof value !== "string") {
			return false;
		}
		return ValidationHelper.isValidRgbColor(value);
	}

	private isValueHexColor(value: unknown): boolean {
		if (typeof value !== "string") {
			return false;
		}
		return ValidationHelper.isValidHexColor(value);
	}

	private isHslColor(value: unknown): boolean {
		if (typeof value !== "string") {
			return false;
		}
		return ValidationHelper.isValidHslColor(value);
	}

	private isValueUUID(value: unknown): boolean {
		if (typeof value !== "string") {
			return false;
		}
		return ValidationHelper.isValidUUID(value);
	}

	private isValueEmail(value: string): boolean {
		return ValidationHelper.isValidEmail(value);
	}

	private isValueURL(value: unknown): boolean {
		if (typeof value !== "string") {
			return false;
		}
		const urlRegex = /^https?:\/\/.+/;
		return urlRegex.test(value) && ValidationHelper.isValidUrl(value);
	}

	private isValueCountryCode(value: unknown): boolean {
		if (typeof value !== "string") {
			return false;
		}
		return ValidationHelper.isValidCountryCode(value);
	}
}
