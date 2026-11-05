// Spec helpers for the connection pages (not shipped: only *.spec.ts files import this).
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { type Component, defineComponent, h } from 'vue';
import { createMemoryHistory, createRouter, type Router, RouterView } from 'vue-router';
import { vTooltip } from '@/components/ui';

const Blank = defineComponent({ render: () => h('div', { 'data-testid': 'blank-page' }) });

/**
 * Mounts `view` as the page of `pattern` (e.g. '/edit-db/:connectionId'), navigated to `url`, under
 * a memory router whose other paths render a blank page. Activates a fresh Pinia.
 */
export async function mountConnectionView(
	view: Component,
	pattern: string,
	url: string = pattern,
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
	const wrapper = mount(Host, {
		global: { plugins: [router, pinia], directives: { tooltip: vTooltip } },
		attachTo: document.body,
	});
	await flushPromises();
	return { wrapper, router };
}

/** The button or link whose text is `label`. */
export function byText(wrapper: VueWrapper, label: string, selector = 'button, a') {
	const match = wrapper.findAll(selector).find((candidate) => candidate.text() === label);
	if (!match) throw new Error(`No element "${label}"`);
	return match;
}
