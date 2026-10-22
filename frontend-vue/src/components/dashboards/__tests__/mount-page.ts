// Spec helper for the charts/dashboards pages: mounts `view` as the page of `pattern` (e.g.
// '/panels/:connectionId/:queryId'), navigated to `url`, under a memory router whose other paths
// render a blank page, so a spec can read `router.currentRoute` after the view navigates.
// Activates a fresh Pinia; stores the spec doesn't vi.mock are real.
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { type Component, defineComponent, h } from 'vue';
import { createMemoryHistory, createRouter, type Router, RouterView } from 'vue-router';
import DialogHost from '@/components/dialog/DialogHost.vue';
import { vTooltip } from '@/components/ui';

const Blank = defineComponent({ render: () => h('div', { 'data-testid': 'blank-page' }) });

export async function mountPage(
	view: Component,
	patterns: string | string[],
	url: string,
): Promise<{ wrapper: VueWrapper; router: Router }> {
	const pinia = createPinia();
	setActivePinia(pinia);
	const router = createRouter({
		history: createMemoryHistory(),
		routes: [
			...[patterns].flat().map((path) => ({ path, component: view })),
			{ path: '/:pathMatch(.*)*', component: Blank },
		],
	});
	router.push(url);
	await router.isReady();
	const Host = defineComponent({ render: () => [h(RouterView), h(DialogHost)] });
	const wrapper = mount(Host, {
		global: { plugins: [router, pinia], directives: { tooltip: vTooltip } },
		attachTo: document.body,
	});
	await flushPromises();
	return { wrapper, router };
}

/** The button (or link) whose text — its UiButton label, without the icon ligature — is `label`. */
export function byText(wrapper: VueWrapper, label: string, selector = 'button, a') {
	const match = wrapper.findAll(selector).find((candidate) => {
		const buttonLabel = candidate.find('.ui-button__label');
		return (buttonLabel.exists() ? buttonLabel.text() : candidate.text()) === label;
	});
	if (!match) throw new Error(`No ${selector} "${label}"`);
	return match;
}
