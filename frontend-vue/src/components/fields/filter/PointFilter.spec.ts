import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import PointFilter from './PointFilter.vue';

describe('PointFilter', () => {
	it('renders nothing without a value', () => {
		const wrapper = mount(PointFilter, { props: { label: 'location' } });
		expect(wrapper.find('input').exists()).toBe(false);
	});

	it('renders X and Y inputs for a { x, y } value', () => {
		const wrapper = mount(PointFilter, { props: { label: 'location', fieldKey: 'k', value: { x: 1, y: 2 } } });
		const inputs = wrapper.findAll('input');
		expect(inputs.map((input) => (input.element as HTMLInputElement).value)).toEqual(['1', '2']);
		expect(inputs.map((input) => input.attributes('name'))).toEqual(['location-k-x', 'location-k-y']);
		expect(wrapper.text()).toContain('Location X coordinate');
	});

	it('parses an "(x, y)" string', () => {
		const wrapper = mount(PointFilter, { props: { label: 'location', value: '(40.7128, -74.0060)' } });
		const inputs = wrapper.findAll('input');
		expect(inputs.map((input) => (input.element as HTMLInputElement).value)).toEqual(['40.7128', '-74.006']);
	});

	it('emits the whole point on each edit', async () => {
		const wrapper = mount(PointFilter, { props: { label: 'location', value: { x: 1, y: 2 } } });
		await wrapper.findAll('input')[0]?.setValue('5');
		await wrapper.findAll('input')[1]?.setValue('');
		expect(wrapper.emitted('fieldChange')).toEqual([[{ x: 5, y: 2 }], [{ x: 5, y: null }]]);
	});

	it('disables the inputs when readonly, as Angular did', () => {
		const wrapper = mount(PointFilter, { props: { label: 'location', readonly: true, value: { x: 1, y: 2 } } });
		expect(wrapper.findAll('input').every((input) => (input.element as HTMLInputElement).disabled)).toBe(true);
	});
});
