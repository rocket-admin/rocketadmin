import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { mockWidgetStructure } from '../stories.mocks';
import RangeEdit from './RangeEdit.vue';

const range = (wrapper: ReturnType<typeof mount>) => wrapper.find('input[type="range"]').element as HTMLInputElement;

describe('RangeEdit', () => {
	it('labels the slider and defaults to 0..100 step 1', () => {
		const wrapper = mount(RangeEdit, { props: { label: 'volume_level' } });
		expect(wrapper.find('label').text()).toContain('Volume level');
		expect(wrapper.find('label').attributes('for')).toBe(range(wrapper).id);
		expect(range(wrapper).min).toBe('0');
		expect(range(wrapper).max).toBe('100');
		expect(range(wrapper).step).toBe('1');
	});

	it('reads min, max and step from widget params', () => {
		const wrapper = mount(RangeEdit, {
			props: { label: 'v', widgetStructure: mockWidgetStructure({ min: 10, max: 200, step: 5 }) },
		});
		expect([range(wrapper).min, range(wrapper).max, range(wrapper).step]).toEqual(['10', '200', '5']);
		expect(wrapper.find('.range-edit__labels').text()).toMatch(/^10\s*10\s*200$/);
	});

	it('keeps the defaults for missing params', () => {
		const wrapper = mount(RangeEdit, { props: { label: 'v', widgetStructure: mockWidgetStructure({ min: 20 }) } });
		expect([range(wrapper).min, range(wrapper).max, range(wrapper).step]).toEqual(['20', '100', '1']);
	});

	it('shows the value, or the minimum when empty', () => {
		expect(range(mount(RangeEdit, { props: { label: 'v', value: 42 } })).value).toBe('42');
		const empty = mount(RangeEdit, { props: { label: 'v', widgetStructure: mockWidgetStructure({ min: 5 }) } });
		expect(range(empty).value).toBe('5');
	});

	it('emits the number and shows it as current', async () => {
		const wrapper = mount(RangeEdit, { props: { label: 'v' } });
		await wrapper.find('input').setValue('42');
		expect(wrapper.emitted('fieldChange')).toEqual([[42]]);
		expect(wrapper.find('.range-edit__current').text()).toBe('42');
	});

	it('disables the slider when disabled or readonly', () => {
		expect(range(mount(RangeEdit, { props: { label: 'v', disabled: true } })).disabled).toBe(true);
		expect(range(mount(RangeEdit, { props: { label: 'v', readonly: true } })).disabled).toBe(true);
	});
});
