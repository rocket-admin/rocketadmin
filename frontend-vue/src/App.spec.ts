import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';
import App from './App.vue';
import { routes } from './router';

describe('App', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		localStorage.clear();
	});

	it('renders the 404 page for an unknown route', async () => {
		const router = createRouter({ history: createMemoryHistory(), routes });
		router.push('/no-such-page');
		await router.isReady();

		const wrapper = mount(App, { global: { plugins: [router] } });
		await flushPromises();

		expect(wrapper.text()).toContain("We can't find the page you are looking for");
		expect(wrapper.text()).toContain('Rocketadmin');
	});
});
