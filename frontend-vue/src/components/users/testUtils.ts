// Spec helpers for the permissions page and its dialogs (not shipped: only *.spec.ts files import this).
import { type DOMWrapper, flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { type Mock, vi } from 'vitest';
import { type Component, defineComponent, h } from 'vue';
import { createMemoryHistory, createRouter, type Router } from 'vue-router';
import { vTooltip } from '@/components/ui';
import { DIALOG_REF, type DialogRef } from '@/composables/useDialog';

const Blank = defineComponent({ render: () => h('div') });

export function createTestRouter(): Router {
	return createRouter({ history: createMemoryHistory(), routes: [{ path: '/:pathMatch(.*)*', component: Blank }] });
}

export interface MockDialogRef extends DialogRef {
	close: Mock<(result?: unknown) => void>;
}

export function mockDialogRef(): MockDialogRef {
	return { id: 1, close: vi.fn(), afterClosed: () => Promise.resolve(undefined) };
}

/** Mounts a dialog component as useDialog().open() would: `data` as a prop and a DialogRef to close. */
export async function mountDialog(
	component: Component,
	data?: unknown,
): Promise<{ wrapper: VueWrapper; dialogRef: MockDialogRef; router: Router }> {
	const dialogRef = mockDialogRef();
	const router = createTestRouter();
	await router.push('/');
	const wrapper = mount(component, {
		props: data === undefined ? {} : { data },
		attachTo: document.body,
		global: {
			plugins: [router],
			provide: { [DIALOG_REF as symbol]: dialogRef },
			directives: { tooltip: vTooltip },
		},
	});
	await flushPromises();
	return { wrapper, dialogRef, router };
}

export function buttonByText(wrapper: VueWrapper, label: string): DOMWrapper<HTMLButtonElement> {
	// A UiButton's leading icon is a ligature, so its text is read from the label span.
	const match = wrapper.findAll('button').find((candidate) => {
		const labelSpan = candidate.find('.ui-button__label');
		return (labelSpan.exists() ? labelSpan.text() : candidate.text()) === label;
	});
	if (!match) throw new Error(`No button "${label}"`);
	return match as DOMWrapper<HTMLButtonElement>;
}

/** Picks the `<option>` whose text is `label` in the native select inside `root`. */
export async function selectOption(root: DOMWrapper<Element> | VueWrapper, label: string): Promise<void> {
	const option = root.findAll('option').find((candidate) => candidate.text() === label);
	if (!option) throw new Error(`No option "${label}"`);
	const select = option.element.closest('select');
	if (!select) throw new Error(`Option "${label}" is not in a select`);
	select.value = (option.element as HTMLOptionElement).value;
	select.dispatchEvent(new Event('change'));
	await flushPromises();
}
