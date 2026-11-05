import { describe, expect, it } from 'vitest';
import type { AISuggestionColumn, AISuggestionInput } from '@/models/ai-suggestions';
import type { TableField, TableForeignKey } from '@/models/table';
import {
	buildConversationContext,
	buildSuggestionInput,
	buildTableContext,
	buildUIContext,
	generateLocalSuggestions,
} from './ai-suggestions';

function field(column_name: string, data_type: string, allow_null = false): TableField {
	return {
		column_name,
		data_type,
		allow_null,
		column_default: null,
		isExcluded: false,
		isSearched: false,
		auto_increment: false,
		character_maximum_length: null,
	};
}

function column(name: string, type: string, nullable = false): AISuggestionColumn {
	return { name, type, nullable };
}

function input(columns: AISuggestionColumn[], extra: Partial<AISuggestionInput> = {}): AISuggestionInput {
	return { table: { name: 'orders', columns, relations: [] }, ...extra };
}

describe('ai suggestions', () => {
	it('buildTableContext maps columns and foreign keys, and only sets a differing display name', () => {
		const fk: TableForeignKey = {
			column_name: 'user_id',
			constraint_name: 'fk',
			referenced_table_name: 'users',
			referenced_column_name: 'id',
		};
		const context = buildTableContext('orders', 'Orders', [field('id', 'int'), field('note', 'text', true)], [fk], 5);
		expect(context).toEqual({
			name: 'orders',
			description: 'Orders',
			row_count: 5,
			columns: [
				{ name: 'id', type: 'int', nullable: false, unique: false, indexed: false },
				{ name: 'note', type: 'text', nullable: true, unique: false, indexed: false },
			],
			relations: [
				{ type: 'fk', from_column: 'user_id', to_table: 'users', to_column: 'id', label: 'orders.user_id -> users.id' },
			],
		});
		expect(buildTableContext('orders', 'orders', [], []).description).toBeUndefined();
	});

	it('buildUIContext turns { column: { op: value } } filters into a list, defaulting op to eq', () => {
		expect(buildUIContext({ status: { neq: 'done' }, name: {} }, { id: 1 }, 'status')).toEqual({
			active_filters: [
				{ column: 'status', op: 'neq', value: 'done' },
				{ column: 'name', op: 'eq', value: undefined },
			],
			selected_row: { id: 1 },
			selected_column: 'status',
		});
		expect(buildUIContext().active_filters).toBeUndefined();
	});

	it('buildConversationContext picks the last user message and the last two messages', () => {
		const chain = [
			{ type: 'user', text: 'first' },
			{ type: 'ai', text: 'answer' },
			{ type: 'user', text: 'second' },
		];
		expect(buildConversationContext(chain)).toEqual({
			last_user_message: 'second',
			last_2_messages: [
				{ role: 'assistant', text: 'answer' },
				{ role: 'user', text: 'second' },
			],
		});
		expect(buildConversationContext([])).toEqual({ last_user_message: undefined, last_2_messages: undefined });
	});

	it('buildSuggestionInput attaches the history', () => {
		const table = { name: 't', columns: [], relations: [] };
		const history = { recently_clicked_ids: ['a'] };
		expect(buildSuggestionInput(history, table)).toEqual({
			table,
			ui_context: undefined,
			conversation: undefined,
			suggestion_history: history,
		});
	});

	describe('generateLocalSuggestions', () => {
		it('always offers the two basic suggestions and EXPLORE without a conversation', () => {
			const output = generateLocalSuggestions(input([column('foo', 'text')]));
			expect(output.table_suggestions.map((s) => s.id)).toEqual(['recent_rows', 'table_overview']);
			expect(output.intent).toEqual(['EXPLORE']);
			expect(output.navigation_suggestions).toEqual([]);
		});

		it('adds column-based suggestions in order and caps the list at 7', () => {
			const columns = [
				column('id', 'int'),
				column('status', 'varchar'),
				column('created_at', 'timestamp'),
				column('email', 'varchar', true),
				column('total', 'decimal'),
			];
			const output = generateLocalSuggestions(
				input(columns, { ui_context: { active_filters: [{ column: 'status', op: 'eq', value: 'new' }] } }),
			);
			expect(output.table_suggestions.map((s) => s.id)).toEqual([
				'recent_rows',
				'table_overview',
				'group_by_status',
				'trend_by_created_at',
				'duplicates_by_email',
				'nulls_overview',
				// 'id' is the first numeric column, but an amount/price/total column wins.
				'stats_total',
			]);
			expect(output.table_suggestions[2]?.title).toBe('Распределение по status');
		});

		it('detects intents from the last user message', () => {
			const output = generateLocalSuggestions(
				input([], { conversation: { last_user_message: 'Покажи сколько дубликатов, потом обнови' } }),
			);
			expect(output.intent).toEqual(['SEARCH', 'SEGMENT', 'QUALITY', 'UPDATE_HELP']);
		});

		it('suggests navigating along foreign keys that have a value in the selected row', () => {
			const output = generateLocalSuggestions({
				table: {
					name: 'orders',
					columns: [],
					relations: [
						{
							type: 'fk',
							from_column: 'user_id',
							to_table: 'users',
							to_column: 'id',
							label: 'orders.user_id -> users.id',
						},
						{ type: 'fk', from_column: 'shop_id', to_table: 'shops', to_column: 'id', label: 'x' },
					],
				},
				ui_context: { selected_row: { user_id: 7, shop_id: null } },
			});
			expect(output.navigation_suggestions).toEqual([
				{
					id: 'nav_to_users',
					title: 'Открыть users',
					target_table: 'users',
					prefilled_query: 'Покажи запись с id = 7',
					why: 'Связь orders.user_id -> users.id',
					confidence: 0.7,
				},
			]);
		});
	});
});
