import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import type { WidgetStructure } from '@/models/table';
import { mockWidgetStructure } from '../stories.mocks';
import ImageEdit from './ImageEdit.vue';

const withParams = (widget_params: unknown): WidgetStructure =>
	({ ...mockWidgetStructure(), widget_params }) as WidgetStructure;

describe('ImageEdit', () => {
	it('previews the URL', () => {
		const wrapper = mount(ImageEdit, { props: { label: 'avatar', value: 'https://example.com/a.png' } });
		expect(wrapper.find('img').attributes('src')).toBe('https://example.com/a.png');
		expect(wrapper.find('.image-edit__prefix').exists()).toBe(false);
	});

	it('shows no preview without a value', () => {
		const wrapper = mount(ImageEdit, { props: { label: 'avatar', value: '' } });
		expect(wrapper.find('img').exists()).toBe(false);
	});

	it('prepends the prefix from object params', () => {
		const wrapper = mount(ImageEdit, {
			props: {
				label: 'avatar',
				value: 'photo.jpg',
				widgetStructure: mockWidgetStructure({ prefix: 'https://cdn.example.com/' }),
			},
		});
		expect(wrapper.find('.image-edit__prefix').text()).toBe('https://cdn.example.com/');
		expect(wrapper.find('img').attributes('src')).toBe('https://cdn.example.com/photo.jpg');
	});

	it('reads the prefix from string params and ignores invalid JSON', () => {
		const fromString = mount(ImageEdit, {
			props: {
				label: 'a',
				value: 'p.jpg',
				widgetStructure: withParams(JSON.stringify({ prefix: 'https://images.test/' })),
			},
		});
		expect(fromString.find('img').attributes('src')).toBe('https://images.test/p.jpg');
		const invalid = mount(ImageEdit, { props: { label: 'a', widgetStructure: withParams('invalid-json') } });
		expect(invalid.find('.image-edit__prefix').exists()).toBe(false);
	});

	it('emits the typed value and flags an invalid URL', async () => {
		const wrapper = mount(ImageEdit, { props: { label: 'avatar' } });
		await wrapper.find('[data-testid="record-avatar-image"]').setValue('not a url');
		expect(wrapper.emitted('fieldChange')).toEqual([['not a url']]);
		expect(wrapper.text()).toContain('URL is invalid.');
		expect(wrapper.find('img').exists()).toBe(false);
		expect((wrapper.find('input').element as HTMLInputElement).checkValidity()).toBe(false);
	});

	it('validates the tail together with the prefix', async () => {
		const wrapper = mount(ImageEdit, {
			props: { label: 'avatar', widgetStructure: mockWidgetStructure({ prefix: 'https://cdn.test/' }) },
		});
		await wrapper.find('input').setValue('photo.jpg');
		expect(wrapper.text()).not.toContain('URL is invalid.');
	});
});
