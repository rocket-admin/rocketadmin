import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import PointEdit from './PointEdit.vue';

describe('PointEdit', () => {
	it('renders nothing without a point', () => {
		const wrapper = mount(PointEdit, { props: { label: 'location', value: null } });
		expect(wrapper.find('input').exists()).toBe(false);
	});

	it('renders X and Y inputs with the coordinates', () => {
		const wrapper = mount(PointEdit, { props: { label: 'location', fieldKey: 'k', value: { x: 40.7, y: -74 } } });
		const labels = wrapper.findAll('label').map((l) => l.text());
		expect(labels).toEqual(['Location X coordinate', 'Location Y coordinate']);
		const inputs = wrapper.findAll('input').map((i) => i.element as HTMLInputElement);
		expect(inputs.map((i) => i.value)).toEqual(['40.7', '-74']);
		expect(inputs.map((i) => i.name)).toEqual(['location-k-x', 'location-k-y']);
	});

	it('emits the whole point with the edited coordinate as a number', async () => {
		const wrapper = mount(PointEdit, { props: { label: 'location', value: { x: 1, y: 2 } } });
		const [x, y] = wrapper.findAll('input');
		await x?.setValue('3.5');
		await y?.setValue('');
		expect(wrapper.emitted('fieldChange')).toEqual([[{ x: 3.5, y: 2 }], [{ x: 3.5, y: null }]]);
	});

	it('does not mutate the value prop', async () => {
		const value = { x: 1, y: 2 };
		const wrapper = mount(PointEdit, { props: { label: 'location', value } });
		await wrapper.find('input').setValue('9');
		expect(value).toEqual({ x: 1, y: 2 });
	});

	it('disables the inputs when readonly', () => {
		const wrapper = mount(PointEdit, { props: { label: 'location', readonly: true, value: { x: 1, y: 2 } } });
		expect(wrapper.findAll('input').every((i) => (i.element as HTMLInputElement).disabled)).toBe(true);
	});
});
