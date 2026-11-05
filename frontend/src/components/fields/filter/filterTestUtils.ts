// Spec helpers for the filter widgets (not shipped: only *.spec.ts files import this).
import type { VueWrapper } from '@vue/test-utils';

/** Picks a comparator in a `FilterComparatorRow` by its visible label ("ends with", "between", …). */
export async function pickComparator(wrapper: VueWrapper, label: string): Promise<void> {
	const select = wrapper.find('[data-testid="filter-comparator"]');
	const option = select.findAll('option').find((o) => o.text() === label);
	if (!option) throw new Error(`No comparator option "${label}"`);
	await select.setValue(option.attributes('value'));
}

/** The labels of a `FilterComparatorRow`'s comparator options. */
export function comparatorLabels(wrapper: VueWrapper): string[] {
	return wrapper
		.find('[data-testid="filter-comparator"]')
		.findAll('option')
		.map((o) => o.text());
}

/** The selected comparator's label. */
export function selectedComparator(wrapper: VueWrapper): string | undefined {
	const select = wrapper.find('[data-testid="filter-comparator"]').element as HTMLSelectElement;
	return select.selectedOptions[0]?.text.trim();
}
