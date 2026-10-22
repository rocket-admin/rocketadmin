// Spec helpers for the connection dialogs (not shipped: only *.spec.ts files import this).
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import type { Component } from 'vue';
import { createMemoryHistory, createRouter, type Router } from 'vue-router';
import DialogHost from '@/components/dialog/DialogHost.vue';
import { vTooltip } from '@/components/ui';
import { type DialogRef, useDialog } from '@/composables/useDialog';

/** Opens `component` through useDialog() inside a mounted DialogHost, with a memory router. */
export async function openDialog<D>(
	component: Component,
	data: D,
): Promise<{ wrapper: VueWrapper; router: Router; dialogRef: DialogRef<unknown> }> {
	const pinia = createPinia();
	setActivePinia(pinia);
	const router = createRouter({
		history: createMemoryHistory(),
		routes: [{ path: '/:pathMatch(.*)*', component: { render: () => null } }],
	});
	router.push('/edit-db/1');
	await router.isReady();
	const wrapper = mount(DialogHost, {
		global: { plugins: [router, pinia], directives: { tooltip: vTooltip } },
		attachTo: document.body,
	});
	const dialogRef = useDialog().open(component, { data });
	await flushPromises();
	return { wrapper, router, dialogRef };
}

export function buttonByText(wrapper: VueWrapper, label: string) {
	const match = wrapper.findAll('button, a').find((candidate) => candidate.text() === label);
	if (!match) throw new Error(`No button "${label}"`);
	return match;
}
