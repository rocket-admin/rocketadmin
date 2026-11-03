// Shared helpers for the table-display specs: a stubbed clipboard and a clickable "row" to mount
// into, so each spec can assert the copy button never lets the click reach the row.
import { flushPromises, type VueWrapper } from '@vue/test-utils';
import { type Mock, vi } from 'vitest';

export { mockWidgetStructure as widget } from '../stories.mocks';

export function stubClipboard(): Mock<(text: string) => Promise<void>> {
	const writeText = vi.fn<(text: string) => Promise<void>>().mockResolvedValue(undefined);
	vi.stubGlobal('navigator', { clipboard: { writeText } });
	return writeText;
}

/**
 * A clipboard stub plus a `<div>` with a click listener standing in for the table row. Mount with
 * `{ attachTo }`, then `clickCopy(wrapper)` reports what was copied, the emitted snackbar messages
 * and whether the row saw the click.
 */
export function setupCopy() {
	const writeText = stubClipboard();
	const rowClick = vi.fn();
	const attachTo = document.createElement('div');
	attachTo.addEventListener('click', rowClick);
	document.body.appendChild(attachTo);

	async function clickCopy(wrapper: Pick<VueWrapper, 'get' | 'emitted'>) {
		await wrapper.get('.table-display-cell__copy').trigger('click');
		await flushPromises();
		return {
			copied: writeText.mock.calls.map(([text]) => text),
			emitted: wrapper.emitted('copyToClipboard') ?? [],
			rowClicked: rowClick.mock.calls.length > 0,
		};
	}

	return { attachTo, clickCopy };
}

/** The cell's value text, without the copy button's icon ligature. */
export function cellText(wrapper: Pick<VueWrapper, 'get'>): string {
	return wrapper.get('.table-display-cell__value').text();
}
