// Pure half of AISuggestionsService: builds the suggestion input from the table/UI/chat state and
// generates the local (non-AI) suggestions. The click history lives in stores/ai-suggestions.ts.
import type {
	AINavigationSuggestion,
	AISuggestionColumn,
	AISuggestionConversation,
	AISuggestionHistory,
	AISuggestionInput,
	AISuggestionOutput,
	AISuggestionRelation,
	AISuggestionTableContext,
	AISuggestionUIContext,
	AITableSuggestion,
} from '@/models/ai-suggestions';
import type { TableField, TableForeignKey } from '@/models/table';

/** Build table context from existing table data */
export function buildTableContext(
	tableName: string,
	displayName: string,
	structure: TableField[],
	foreignKeys: TableForeignKey[],
	rowCount?: number,
): AISuggestionTableContext {
	const columns: AISuggestionColumn[] = structure.map((field) => ({
		name: field.column_name,
		type: field.data_type,
		nullable: field.allow_null,
		unique: false,
		indexed: false,
	}));

	const relations: AISuggestionRelation[] = foreignKeys.map((fk) => ({
		type: 'fk' as const,
		from_column: fk.column_name,
		to_table: fk.referenced_table_name,
		to_column: fk.referenced_column_name,
		label: `${tableName}.${fk.column_name} -> ${fk.referenced_table_name}.${fk.referenced_column_name}`,
	}));

	return {
		name: tableName,
		description: displayName !== tableName ? displayName : undefined,
		row_count: rowCount,
		columns,
		relations,
	};
}

/** Build UI context from current state; filters are `{ column: { op: value } }`. */
export function buildUIContext(
	activeFilters?: Record<string, Record<string, unknown>>,
	selectedRow?: Record<string, unknown>,
	selectedColumn?: string,
): AISuggestionUIContext {
	const filters = activeFilters
		? Object.entries(activeFilters).map(([column, filterValue]) => {
				const op = Object.keys(filterValue)[0] || 'eq';
				const value = Object.values(filterValue)[0];
				return { column, op, value };
			})
		: undefined;

	return {
		active_filters: filters,
		selected_row: selectedRow,
		selected_column: selectedColumn,
	};
}

/** Build conversation context */
export function buildConversationContext(messagesChain: { type: string; text: string }[]): AISuggestionConversation {
	const lastUserMessage = [...messagesChain].reverse().find((m) => m.type === 'user')?.text;

	const last2Messages = messagesChain.slice(-2).map((m) => ({
		role: m.type === 'user' ? 'user' : 'assistant',
		text: m.text,
	}));

	return {
		last_user_message: lastUserMessage,
		last_2_messages: last2Messages.length > 0 ? last2Messages : undefined,
	};
}

/** Build full suggestion input */
export function buildSuggestionInput(
	history: AISuggestionHistory,
	tableContext: AISuggestionTableContext,
	uiContext?: AISuggestionUIContext,
	conversationContext?: AISuggestionConversation,
): AISuggestionInput {
	return {
		table: tableContext,
		ui_context: uiContext,
		conversation: conversationContext,
		suggestion_history: history,
	};
}

/** Generate local suggestions based on table context (fallback when no AI) */
export function generateLocalSuggestions(input: AISuggestionInput): AISuggestionOutput {
	const suggestions: AITableSuggestion[] = [];
	const { table, ui_context } = input;

	// Find datetime columns for trend analysis
	const dateColumns = table.columns.filter(
		(c) =>
			c.type.toLowerCase().includes('date') ||
			c.type.toLowerCase().includes('time') ||
			c.name.toLowerCase().includes('created') ||
			c.name.toLowerCase().includes('updated'),
	);

	// Find status/categorical columns
	const statusColumns = table.columns.filter(
		(c) =>
			c.name.toLowerCase().includes('status') ||
			c.name.toLowerCase().includes('state') ||
			c.name.toLowerCase().includes('type'),
	);

	// Find email/identifier columns
	const identifierColumns = table.columns.filter(
		(c) =>
			c.name.toLowerCase().includes('email') || c.name.toLowerCase().includes('name') || c.name.toLowerCase() === 'id',
	);

	// Find numeric columns
	const numericColumns = table.columns.filter(
		(c) =>
			c.type.toLowerCase().includes('int') ||
			c.type.toLowerCase().includes('decimal') ||
			c.type.toLowerCase().includes('numeric') ||
			c.type.toLowerCase().includes('float'),
	);

	// Basic suggestions
	suggestions.push({
		id: 'recent_rows',
		title: 'Последние записи',
		message: 'Покажи последние 10 записей в таблице',
		confidence: 0.9,
		risk: 'low',
	});

	suggestions.push({
		id: 'table_overview',
		title: 'Обзор таблицы',
		message: 'Дай краткий обзор структуры таблицы и основных данных',
		confidence: 0.85,
		risk: 'low',
	});

	// Status distribution if status column exists
	const statusColumn = statusColumns[0];
	if (statusColumn) {
		suggestions.push({
			id: `group_by_${statusColumn.name}`,
			title: `Распределение по ${statusColumn.name}`,
			message: `Покажи распределение записей по полю "${statusColumn.name}" с количеством в каждой группе`,
			confidence: 0.8,
			risk: 'low',
		});
	}

	// Trend analysis if date column exists
	const dateColumn = dateColumns[0];
	if (dateColumn) {
		suggestions.push({
			id: `trend_by_${dateColumn.name}`,
			title: `Тренд по ${dateColumn.name}`,
			message: `Покажи тренд создания записей по полю "${dateColumn.name}" по месяцам`,
			confidence: 0.75,
			risk: 'low',
		});
	}

	// Duplicates check if identifier column exists
	const identifierColumn =
		identifierColumns.find((c) => c.name.toLowerCase().includes('email')) || identifierColumns[0];
	if (identifierColumn) {
		suggestions.push({
			id: `duplicates_by_${identifierColumn.name}`,
			title: `Дубликаты по ${identifierColumn.name}`,
			message: `Найди все дубликаты по полю "${identifierColumn.name}" и покажи группы с количеством`,
			confidence: 0.7,
			risk: 'low',
		});
	}

	// Null analysis
	const nullableColumns = table.columns.filter((c) => c.nullable);
	if (nullableColumns.length > 0) {
		suggestions.push({
			id: 'nulls_overview',
			title: 'Анализ пустых значений',
			message: 'Покажи статистику по NULL значениям во всех колонках',
			confidence: 0.7,
			risk: 'low',
		});
	}

	// Statistics for numeric columns
	const numericColumn =
		numericColumns.find(
			(c) =>
				c.name.toLowerCase().includes('amount') ||
				c.name.toLowerCase().includes('price') ||
				c.name.toLowerCase().includes('total'),
		) || numericColumns[0];
	if (numericColumn) {
		suggestions.push({
			id: `stats_${numericColumn.name}`,
			title: `Статистика по ${numericColumn.name}`,
			message: `Рассчитай статистику (min, max, avg, sum) для поля "${numericColumn.name}"`,
			confidence: 0.7,
			risk: 'low',
		});
	}

	// Context-aware suggestions based on active filters
	if (ui_context?.active_filters && ui_context.active_filters.length > 0) {
		suggestions.push({
			id: 'filtered_count',
			title: 'Количество по фильтру',
			message: 'Сколько записей соответствует текущему фильтру?',
			confidence: 0.85,
			risk: 'low',
		});
	}

	// Take top 5-7 suggestions
	const finalSuggestions = suggestions.slice(0, 7);

	return {
		intent: detectIntent(input),
		table_suggestions: finalSuggestions,
		navigation_suggestions: generateNavigationSuggestions(input),
	};
}

/** Detect user intent from context */
function detectIntent(input: AISuggestionInput): string[] {
	const intents: string[] = [];
	const lastMessage = input.conversation?.last_user_message?.toLowerCase() || '';

	if (lastMessage.includes('покажи') || lastMessage.includes('найди') || lastMessage.includes('где')) {
		intents.push('SEARCH');
	}
	if (lastMessage.includes('сколько') || lastMessage.includes('группир') || lastMessage.includes('распределен')) {
		intents.push('SEGMENT');
	}
	if (lastMessage.includes('дублик') || lastMessage.includes('null') || lastMessage.includes('пуст')) {
		intents.push('QUALITY');
	}
	if (lastMessage.includes('обнови') || lastMessage.includes('измени')) {
		intents.push('UPDATE_HELP');
	}

	if (intents.length === 0) {
		intents.push('EXPLORE');
	}

	return intents;
}

/** Generate navigation suggestions for related tables */
function generateNavigationSuggestions(input: AISuggestionInput): AINavigationSuggestion[] {
	const { table, ui_context } = input;
	const suggestions: AINavigationSuggestion[] = [];

	if (table.relations.length > 0 && ui_context?.selected_row) {
		for (const relation of table.relations.slice(0, 3)) {
			const fkValue = ui_context.selected_row[relation.from_column];
			if (fkValue) {
				suggestions.push({
					id: `nav_to_${relation.to_table}`,
					title: `Открыть ${relation.to_table}`,
					target_table: relation.to_table,
					prefilled_query: `Покажи запись с ${relation.to_column} = ${fkValue}`,
					why: `Связь ${relation.label}`,
					confidence: 0.7,
				});
			}
		}
	}

	return suggestions;
}
