import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TableRow } from '@/models/table';
import { useTableStateStore } from './table-state';

function row(id: number): TableRow {
	return {
		connectionID: 'c',
		tableName: 't',
		record: { id },
		columnsOrder: [],
		primaryKeys: { id },
		foreignKeys: {},
		foreignKeysList: [],
		widgets: {},
		widgetsList: [],
		fieldsTypes: {},
		relatedRecords: null,
	};
}

describe('table state store', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		sessionStorage.clear();
	});

	it('selects a row, closing the AI panel, and deselects it when selected again', () => {
		const store = useTableStateStore();
		store.handleViewAIpanel();
		store.toggleAIPanelExpanded();

		store.selectRow(row(1));
		expect(store.selectedRow?.primaryKeys).toEqual({ id: 1 });
		expect(store.aiPanelOpen).toBe(false);
		expect(store.aiPanelExpanded).toBe(false);

		store.selectRow(row(2));
		expect(store.selectedRow?.primaryKeys).toEqual({ id: 2 });
		store.selectRow(row(2));
		expect(store.selectedRow).toBeNull();
	});

	it('toggles the AI panel, clearing the selection and collapsing it on close', () => {
		const store = useTableStateStore();
		store.selectRow(row(1));
		store.handleViewAIpanel();
		expect(store.aiPanelOpen).toBe(true);
		expect(store.selectedRow).toBeNull();

		store.toggleAIPanelExpanded();
		expect(store.aiPanelExpanded).toBe(true);
		store.handleViewAIpanel();
		expect(store.aiPanelOpen).toBe(false);
		expect(store.aiPanelExpanded).toBe(false);
	});

	it('keeps the back-url params in sessionStorage, upper-casing the sort direction', () => {
		const store = useTableStateStore();
		store.setBackUrlParams(2, 30, 'name', 'asc');
		expect(store.getBackUrlParams()).toEqual({
			page_index: 2,
			page_size: 30,
			sort_active: 'name',
			sort_direction: 'ASC',
		});
		store.setBackUrlParams(0, 10, undefined, undefined);
		expect(store.getBackUrlParams()).toEqual({ page_index: 0, page_size: 10 });
	});

	it('keeps the back-url filters and tolerates corrupt storage', () => {
		const store = useTableStateStore();
		store.setBackUrlFilters({ city: { eq: 'NY' } });
		expect(store.getBackUrlFilters()).toEqual({ city: { eq: 'NY' } });

		const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
		sessionStorage.setItem('backUrlFilters', '{not json');
		expect(store.getBackUrlFilters()).toBeNull();
		expect(consoleError).toHaveBeenCalled();
		consoleError.mockRestore();
	});
});
