// Spec helpers for the table pages (not shipped: only *.spec.ts files import this).
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { vi } from 'vitest';
import { type Component, defineComponent, h } from 'vue';
import { createMemoryHistory, createRouter, type Router, RouterView } from 'vue-router';

const Blank = defineComponent({ render: () => h('div', { 'data-testid': 'blank-page' }) });

/**
 * Mounts `view` as the page of `pattern` (e.g. '/dashboard/:connectionId/:tableName/widgets'),
 * navigated to `url`, under a memory router whose other paths render a blank page. Activates a
 * fresh Pinia and waits for lazily imported components.
 */
export async function mountTableView(
	view: Component,
	pattern: string,
	url: string,
): Promise<{ wrapper: VueWrapper; router: Router }> {
	const pinia = createPinia();
	setActivePinia(pinia);
	const router = createRouter({
		history: createMemoryHistory(),
		routes: [
			{ path: pattern, component: view },
			{ path: '/:pathMatch(.*)*', component: Blank },
		],
	});
	router.push(url);
	await router.isReady();
	const Host = defineComponent({ render: () => h(RouterView) });
	const wrapper = mount(Host, { global: { plugins: [router, pinia] }, attachTo: document.body });
	await settle();
	return { wrapper, router };
}

/** Lets pending requests and lazily imported components resolve. */
export async function settle(): Promise<void> {
	await flushPromises();
	await vi.dynamicImportSettled();
	await flushPromises();
}

export function byTestId(wrapper: VueWrapper, id: string) {
	return wrapper.find(`[data-testid="${id}"]`);
}

/** The button (or link) whose text is `label`. */
export function buttonByText(wrapper: VueWrapper, label: string) {
	const match = wrapper.findAll('button, a').find((candidate) => candidate.text() === label);
	if (!match) throw new Error(`No button "${label}"`);
	return match;
}
