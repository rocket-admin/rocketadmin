import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';
import ForeignKeyRecordView from './ForeignKeyRecordView.vue';

const router = createRouter({
	history: createMemoryHistory(),
	routes: [{ path: '/:pathMatch(.*)*', component: { render: () => null } }],
});

const mountFk = (displayValue: string | number | null | undefined) =>
	mount(ForeignKeyRecordView, {
		props: { link: '/dashboard/c1/customers/entry', primaryKeysParams: { id: 1 }, displayValue },
		global: { plugins: [router] },
	});

describe('ForeignKeyRecordView', () => {
	it('links to the referenced row in view mode', () => {
		const link = mountFk('Ada').find('a');
		expect(link.attributes('href')).toBe('/dashboard/c1/customers/entry?id=1&mode=view');
		expect(link.text()).toContain('Ada');
	});

	it('renders a dash for null and undefined', () => {
		for (const value of [null, undefined]) {
			const wrapper = mountFk(value);
			expect(wrapper.find('a').exists()).toBe(false);
			expect(wrapper.text()).toBe('—');
		}
	});

	it('keeps 0 and the empty string as links', () => {
		expect(mountFk(0).find('a').text()).toContain('0');
		expect(mountFk('').find('a').exists()).toBe(true);
	});

	it('emits foreignKeyClick with the keys and the value', async () => {
		const wrapper = mountFk('Ada');
		await wrapper.find('a').trigger('click');
		expect(wrapper.emitted('foreignKeyClick')).toEqual([[{ foreignKey: { id: 1 }, value: 'Ada' }]]);
	});
});
