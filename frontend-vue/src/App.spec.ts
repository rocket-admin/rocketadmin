import { flushPromises, mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';
import { createVuetify } from 'vuetify';
import App from './App.vue';
import { routes } from './router';

describe('App', () => {
	it('renders the home route', async () => {
		const router = createRouter({ history: createMemoryHistory(), routes });
		router.push('/');
		await router.isReady();

		const wrapper = mount(App, { global: { plugins: [router, createVuetify()] } });
		await flushPromises();

		expect(wrapper.text()).toContain('Rocketadmin');
	});
});
