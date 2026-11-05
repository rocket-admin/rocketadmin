// Spec helpers for the auth pages (not shipped: only *.spec.ts files import this).
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { type Component, defineComponent, h } from 'vue';
import { createMemoryHistory, createRouter, type Router, RouterView } from 'vue-router';

const Blank = defineComponent({ render: () => h('div', { 'data-testid': 'blank-page' }) });

/**
 * Mounts `view` as the page of `pattern` (e.g. '/company/:companyId/verify/:verificationToken'),
 * navigated to `url`, under a memory router whose other paths render a blank page — so a spec can
 * read `router.currentRoute` after the view navigates. Activates a fresh Pinia.
 */
export async function mountAuthView(
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
	const wrapper = mount(Host, { global: { plugins: [router, pinia] }, attachTo: document.body });
	await flushPromises();
	return { wrapper, router };
}

/** The button whose text is `label`. */
export function buttonByText(wrapper: VueWrapper, label: string) {
	const match = wrapper.findAll('button').find((candidate) => candidate.text() === label);
	if (!match) throw new Error(`No button "${label}"`);
	return match;
}
