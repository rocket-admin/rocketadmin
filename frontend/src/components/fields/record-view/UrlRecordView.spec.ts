import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import UrlRecordView from './UrlRecordView.vue';

describe('UrlRecordView', () => {
	it('links a valid URL in a new tab', () => {
		const link = mount(UrlRecordView, { props: { value: 'https://example.com' } }).find('a');
		expect(link.attributes('href')).toBe('https://example.com');
		expect(link.attributes('target')).toBe('_blank');
		expect(link.text()).toContain('https://example.com');
	});

	it('stops the click from reaching the row', async () => {
		const wrapper = mount(UrlRecordView, { props: { value: 'https://example.com' }, attachTo: document.body });
		let bubbled = false;
		const onBodyClick = () => {
			bubbled = true;
		};
		document.body.addEventListener('click', onBodyClick);
		const link = wrapper.find('a');
		link.element.addEventListener('click', (event) => event.preventDefault());
		await link.trigger('click');
		expect(bubbled).toBe(false);
		document.body.removeEventListener('click', onBodyClick);
		wrapper.unmount();
	});

	it('shows an invalid URL as text', () => {
		const wrapper = mount(UrlRecordView, { props: { value: 'not a url' } });
		expect(wrapper.find('a').exists()).toBe(false);
		expect(wrapper.text()).toBe('not a url');
	});

	it('renders a dash for null', () => {
		expect(mount(UrlRecordView, { props: { value: null } }).text()).toBe('—');
	});
});
