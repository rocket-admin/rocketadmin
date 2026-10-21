import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import ColorRecordView from './ColorRecordView.vue';

const swatch = (value: string | null) =>
	mount(ColorRecordView, { props: { value } }).find<HTMLElement>('.color-record-view__swatch');

describe('ColorRecordView', () => {
	it('shows a swatch for a hex colour', () => {
		const el = swatch('#ff0000');
		expect(el.exists()).toBe(true);
		expect(el.element.style.backgroundColor).toBe('rgb(255, 0, 0)');
		expect(el.attributes('title')).toBe('#ff0000');
	});

	it('normalizes rgb() and bare hex', () => {
		expect(swatch('rgb(0, 128, 0)').element.style.backgroundColor).toBe('rgb(0, 128, 0)');
		expect(swatch('00f').element.style.backgroundColor).toBe('rgb(0, 0, 255)');
	});

	it('has no swatch for an invalid colour, but shows the text', () => {
		const wrapper = mount(ColorRecordView, { props: { value: 'notacolor' } });
		expect(wrapper.find('.color-record-view__swatch').exists()).toBe(false);
		expect(wrapper.text()).toBe('notacolor');
	});

	it('renders a dash for null', () => {
		expect(mount(ColorRecordView, { props: { value: null } }).text()).toBe('—');
	});
});
