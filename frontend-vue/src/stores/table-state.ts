// Port of TableStateService: the row selected in the table view (shown in the side row view), the
// AI panel's open/expanded state, and the "back to table" paging/sort/filter params kept in
// sessionStorage so the row edit page can return to the same view.
//
// The three BehaviorSubjects (`cast`, `aiPanelCast`, `aiPanelExpandedCast`) are plain state here:
// `selectedRow`, `aiPanelOpen`, `aiPanelExpanded`. Watch them instead of subscribing.
import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { TableRow } from '@/models/table';

export interface BackUrlParams {
	page_index: number;
	page_size: number;
	sort_active?: string;
	sort_direction?: string;
}

export type BackUrlFilters = Record<string, unknown>;

const BACK_URL_PARAMS_KEY = 'backUrlParams';
const BACK_URL_FILTERS_KEY = 'backUrlFilters';

export const useTableStateStore = defineStore('tableState', () => {
	const selectedRow = ref<TableRow | null>(null);
	const aiPanelOpen = ref(false);
	const aiPanelExpanded = ref(false);

	function setBackUrlParams(
		pageIndex: number,
		pageSize: number,
		sortField: string | undefined,
		sortDirection: string | undefined,
	): void {
		const params: BackUrlParams = {
			page_index: pageIndex,
			page_size: pageSize,
			...(sortField !== undefined && { sort_active: sortField }),
			...(sortDirection !== undefined && { sort_direction: sortDirection.toUpperCase() }),
		};
		writeSessionItem(BACK_URL_PARAMS_KEY, params);
	}

	function getBackUrlParams(): BackUrlParams | null {
		return readSessionItem<BackUrlParams>(BACK_URL_PARAMS_KEY);
	}

	function setBackUrlFilters(filters: BackUrlFilters | null): void {
		writeSessionItem(BACK_URL_FILTERS_KEY, filters);
	}

	function getBackUrlFilters(): BackUrlFilters | null {
		return readSessionItem<BackUrlFilters>(BACK_URL_FILTERS_KEY);
	}

	/** Selecting the selected row again deselects it; selecting a row closes the AI panel. */
	function selectRow(row: TableRow): void {
		if (selectedRow.value && JSON.stringify(selectedRow.value.primaryKeys) === JSON.stringify(row.primaryKeys)) {
			selectedRow.value = null;
		} else {
			selectedRow.value = row;
			closeAIpanel();
		}
	}

	/** Toggles the AI panel; opening it clears the row selection, closing it collapses it. */
	function handleViewAIpanel(): void {
		clearSelection();
		aiPanelOpen.value = !aiPanelOpen.value;
		if (!aiPanelOpen.value) aiPanelExpanded.value = false;
	}

	function clearSelection(): void {
		selectedRow.value = null;
	}

	function closeAIpanel(): void {
		aiPanelOpen.value = false;
		aiPanelExpanded.value = false;
	}

	function toggleAIPanelExpanded(): void {
		aiPanelExpanded.value = !aiPanelExpanded.value;
	}

	return {
		selectedRow,
		aiPanelOpen,
		aiPanelExpanded,
		setBackUrlParams,
		getBackUrlParams,
		setBackUrlFilters,
		getBackUrlFilters,
		selectRow,
		handleViewAIpanel,
		clearSelection,
		closeAIpanel,
		toggleAIPanelExpanded,
	};
});

function readSessionItem<T>(key: string): T | null {
	const item = sessionStorage.getItem(key);
	if (!item) return null;
	try {
		return JSON.parse(item) as T;
	} catch (error) {
		console.error(`Error parsing JSON from sessionStorage for key "${key}":`, error);
		return null;
	}
}

function writeSessionItem(key: string, value: unknown): void {
	sessionStorage.setItem(key, JSON.stringify(value));
}
