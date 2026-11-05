import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import type { WidgetStructure } from '@/models/table';
import { mockWidgetStructure } from '../stories.mocks';
import UrlEdit from './UrlEdit.vue';

/** The API sometimes sends `widget_params` as a JSON string, which `WidgetStructure` doesn't model. */
const rawParams = (json: string) => json as unknown as WidgetStructure['widget_params'];

describe('UrlEdit', () => {
	it('renders the normalized label and the value', () => {
		const wrapper = mount(UrlEdit, { props: { label: 'home_page', fieldKey: 'k', value: 'https://example.com' } });
		expect(wrapper.find('label').text()).toContain('Home page');
		expect((wrapper.find('[data-testid="record-home_page-image"]').element as HTMLInputElement).value).toBe(
			'https://example.com',
		);
	});

	it('has no prefix by default', () => {
		const wrapper = mount(UrlEdit, { props: { label: 'link', widgetStructure: mockWidgetStructure({}) } });
		expect(wrapper.find('.url-edit__prefix').exists()).toBe(false);
	});

	it('shows the prefix from widget params, object or JSON string', () => {
		const fromObject = mount(UrlEdit, {
			props: { label: 'link', widgetStructure: mockWidgetStructure({ prefix: 'https://api.example.com/' }) },
		});
		expect(fromObject.find('.url-edit__prefix').text()).toBe('https://api.example.com/');

		const ws = mockWidgetStructure();
		const fromString = mount(UrlEdit, {
			props: {
				label: 'link',
				widgetStructure: { ...ws, widget_params: rawParams(JSON.stringify({ prefix: 'https://test.com/' })) },
			},
		});
		expect(fromString.find('.url-edit__prefix').text()).toBe('https://test.com/');
	});

	it('ignores unparseable widget params', () => {
		const ws = mockWidgetStructure();
		const wrapper = mount(UrlEdit, {
			props: { label: 'link', widgetStructure: { ...ws, widget_params: rawParams('invalid-json') } },
		});
		expect(wrapper.find('.url-edit__prefix').exists()).toBe(false);
	});

	it('emits the typed value', async () => {
		const wrapper = mount(UrlEdit, { props: { label: 'link' } });
		await wrapper.find('input').setValue('https://rocketadmin.com');
		expect(wrapper.emitted('fieldChange')).toEqual([['https://rocketadmin.com']]);
	});

	it('flags an invalid URL once edited', async () => {
		const wrapper = mount(UrlEdit, { props: { label: 'link' } });
		const input = wrapper.find('input');
		await input.setValue('example.com');
		expect(wrapper.text()).toContain('URL is invalid.');
		expect((input.element as HTMLInputElement).checkValidity()).toBe(false);
	});

	it('validates the value with the prefix prepended', async () => {
		const wrapper = mount(UrlEdit, {
			props: { label: 'link', widgetStructure: mockWidgetStructure({ prefix: 'https://cdn.example.com/' }) },
		});
		await wrapper.find('input').setValue('images/a.png');
		expect(wrapper.text()).not.toContain('URL is invalid.');
		expect((wrapper.find('input').element as HTMLInputElement).checkValidity()).toBe(true);
	});
});
