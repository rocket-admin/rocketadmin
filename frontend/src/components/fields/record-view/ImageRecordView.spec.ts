import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { mockWidgetStructure } from '../stories.mocks';
import ImageRecordView from './ImageRecordView.vue';

describe('ImageRecordView', () => {
	it('shows the image for a URL value', () => {
		const wrapper = mount(ImageRecordView, { props: { value: 'https://cdn.example.com/a.png' } });
		expect(wrapper.find('img').attributes('src')).toBe('https://cdn.example.com/a.png');
		expect(wrapper.text()).toBe('https://cdn.example.com/a.png');
	});

	it('prepends widget_params.prefix', () => {
		const wrapper = mount(ImageRecordView, {
			props: { value: 'image.png', widgetStructure: mockWidgetStructure({ prefix: 'https://cdn.example.com/' }) },
		});
		expect(wrapper.find('img').attributes('src')).toBe('https://cdn.example.com/image.png');
	});

	it('shows a placeholder when the source is not a URL', () => {
		const wrapper = mount(ImageRecordView, { props: { value: 'image.png' } });
		expect(wrapper.find('img').exists()).toBe(false);
		expect(wrapper.text()).toContain('[Image URL]');
		expect(wrapper.text()).toContain('image.png');
	});

	it('renders a dash for null', () => {
		expect(mount(ImageRecordView, { props: { value: null } }).text()).toContain('—');
	});
});
