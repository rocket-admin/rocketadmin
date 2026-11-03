import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { mockWidgetStructure } from '../stories.mocks';
import ColorEdit from './ColorEdit.vue';

const picker = (wrapper: ReturnType<typeof mount>) => wrapper.find('input[type="color"]');

async function pick(wrapper: ReturnType<typeof mount>, value: string) {
	await picker(wrapper).setValue(value);
}

describe('ColorEdit', () => {
	it('renders the label and the text value', () => {
		const wrapper = mount(ColorEdit, { props: { label: 'brand_color', value: 'rgb(255, 0, 0)' } });
		expect(wrapper.find('label').text()).toContain('Brand color');
		expect((wrapper.find('[data-testid="record-brand_color-color"]').element as HTMLInputElement).value).toBe(
			'rgb(255, 0, 0)',
		);
	});

	it.each([
		['#ff0000', '#ff0000'],
		['ff0000', '#ff0000'],
		['rgb(0, 255, 0)', '#00ff00'],
		['invalid', '#000000'],
		[null, '#000000'],
	])('feeds %j to the picker as %s', (value, expected) => {
		const wrapper = mount(ColorEdit, { props: { label: 'c', value } });
		expect((picker(wrapper).element as HTMLInputElement).value.toLowerCase()).toBe(expected);
	});

	it('emits typed text as-is', async () => {
		const wrapper = mount(ColorEdit, { props: { label: 'c' } });
		await wrapper.find('[data-testid="record-c-color"]').setValue('notacolor');
		expect(wrapper.emitted('fieldChange')).toEqual([['notacolor']]);
	});

	it.each([
		[undefined, '#00FF00'],
		['hex_hash', '#00FF00'],
		['hex', '00FF00'],
		['rgb', 'rgb(0, 255, 0)'],
		['hsl', '#00FF00'],
	])('emits a picked colour in format %s as %s', async (format, expected) => {
		const wrapper = mount(ColorEdit, {
			props: { label: 'c', widgetStructure: mockWidgetStructure(format ? { format } : {}) },
		});
		await pick(wrapper, '#00ff00');
		expect(wrapper.emitted('fieldChange')).toEqual([[expected]]);
		expect((wrapper.find('[data-testid="record-c-color"]').element as HTMLInputElement).value).toBe(expected);
	});

	it('disables the picker when readonly', () => {
		const wrapper = mount(ColorEdit, { props: { label: 'c', readonly: true } });
		expect((picker(wrapper).element as HTMLInputElement).disabled).toBe(true);
	});
});
