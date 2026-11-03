import { mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { COPIED_MESSAGE } from '../useFieldWidget';
import { cellText, setupCopy, widget } from './testing';
import UrlDisplay from './UrlDisplay.vue';

describe('UrlDisplay', () => {
	afterEach(() => vi.unstubAllGlobals());

	it('links a valid URL in a new tab', () => {
		const link = mount(UrlDisplay, { props: { value: 'https://example.com' } }).get('a');
		expect(link.attributes('href')).toBe('https://example.com');
		expect(link.attributes('target')).toBe('_blank');
		expect(link.text()).toContain('https://example.com');
	});

	it('prepends the prefix param', () => {
		const link = mount(UrlDisplay, {
			props: { value: 'example.com/path', widgetStructure: widget({ prefix: 'https://' }) },
		}).get('a');
		expect(link.attributes('href')).toBe('https://example.com/path');
	});

	it('shows an invalid URL as text, and a dash for null', () => {
		const wrapper = mount(UrlDisplay, { props: { value: 'not a valid url' } });
		expect(wrapper.find('a').exists()).toBe(false);
		expect(cellText(wrapper)).toBe('not a valid url');
		expect(cellText(mount(UrlDisplay, { props: { value: null } }))).toBe('—');
	});

	it('does not let a link click reach the row', async () => {
		const { attachTo } = setupCopy();
		const rowClick = vi.fn();
		attachTo.addEventListener('click', rowClick);
		const wrapper = mount(UrlDisplay, { props: { value: 'https://example.com' }, attachTo });
		wrapper.get('a').element.addEventListener('click', (event) => event.preventDefault());
		await wrapper.get('a').trigger('click');
		expect(rowClick).not.toHaveBeenCalled();
	});

	it('copies the value', async () => {
		const { attachTo, clickCopy } = setupCopy();
		const wrapper = mount(UrlDisplay, { props: { value: 'https://example.com' }, attachTo });
		expect(wrapper.get('button').attributes('aria-label')).toBe('Copy URL');
		const result = await clickCopy(wrapper);
		expect(result).toEqual({ copied: ['https://example.com'], emitted: [[COPIED_MESSAGE]], rowClicked: false });
	});
});
