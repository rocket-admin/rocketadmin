// The dashboard's `SelectionModel<any>(true, [])` for the table rows. UiTable selects row *keys*
// (so a selection survives a refetch); this keeps the row objects behind them as well, because the
// bulk actions, the CSV export and the confirmation dialog need the selected rows' data — including
// rows selected on another page, which SelectionModel kept too.
import { computed, reactive, ref, shallowRef } from 'vue';
import type { TableRowKey } from '@/components/ui';

type R = Record<string, unknown>;

export function useRowSelection() {
	const keys = ref<TableRowKey[]>([]);
	const rowsByKey = shallowRef(new Map<TableRowKey, R>());

	/** The selected rows, in selection order. */
	const selected = computed<R[]>(() =>
		keys.value.map((key) => rowsByKey.value.get(key)).filter((row): row is R => row !== undefined),
	);
	const hasValue = computed(() => keys.value.length > 0);

	/**
	 * Replaces the selection with `next` (UiTable's `update:selected`). New keys are resolved
	 * through `lookup`, which knows the rows on the current page.
	 */
	function setKeys(next: TableRowKey[], lookup: (key: TableRowKey) => R | undefined): void {
		const map = new Map<TableRowKey, R>();
		for (const key of next) {
			const row = rowsByKey.value.get(key) ?? lookup(key);
			if (row !== undefined) map.set(key, row);
		}
		rowsByKey.value = map;
		keys.value = next.filter((key) => map.has(key));
	}

	/** Adds the rows (SelectionModel.select). */
	function select(entries: { key: TableRowKey; row: R }[]): void {
		const map = new Map(rowsByKey.value);
		const next = [...keys.value];
		for (const { key, row } of entries) {
			if (!map.has(key)) next.push(key);
			map.set(key, row);
		}
		rowsByKey.value = map;
		keys.value = next;
	}

	function isSelected(key: TableRowKey): boolean {
		return rowsByKey.value.has(key);
	}

	function clear(): void {
		keys.value = [];
		rowsByKey.value = new Map();
	}

	// reactive(): handed down as a prop, `selection.keys` / `selection.selected` read unwrapped.
	return reactive({ keys, selected, hasValue, setKeys, select, isSelected, clear });
}

export type RowSelection = ReturnType<typeof useRowSelection>;
