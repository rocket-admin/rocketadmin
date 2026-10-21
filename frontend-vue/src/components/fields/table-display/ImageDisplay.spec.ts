import { mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { COPIED_MESSAGE } from '../useFieldWidget';
import ImageDisplay from './ImageDisplay.vue';
import { setupCopy, widget } from './testing';

describe('ImageDisplay', () => {
	afterEach(() => vi.unstubAllGlobals());

	it('shows a thumbnail for a URL, sized by the height param', () => {
		const img = mount(ImageDisplay, {
			props: { value: 'https://example.com/image.png', widgetStructure: widget({ height: 50 }) },
		}).get('img');
		expect(img.attributes('src')).toBe('https://example.com/image.png');
		expect(img.attributes('style')).toContain('--image-display-height: 50px');
	});

	it('shows a placeholder for a non-URL', () => {
		const wrapper = mount(ImageDisplay, { props: { value: 'not-a-url' } });
		expect(wrapper.find('img').exists()).toBe(false);
		expect(wrapper.get('.image-display__placeholder').text()).toBe('[Image URL]');
	});

	it('prepends the prefix param', () => {
		const img = mount(ImageDisplay, {
			props: { value: 'cat.png', widgetStructure: widget({ prefix: 'https://cdn.example.com/' }) },
		}).get('img');
		expect(img.attributes('src')).toBe('https://cdn.example.com/cat.png');
	});

	it('copies the full image URL', async () => {
		const { attachTo, clickCopy } = setupCopy();
		const wrapper = mount(ImageDisplay, {
			props: { value: 'cat.png', widgetStructure: widget({ prefix: 'https://cdn.example.com/' }) },
			attachTo,
		});
		expect(wrapper.get('button').attributes('aria-label')).toBe('Copy image URL');
		const result = await clickCopy(wrapper);
		expect(result).toEqual({
			copied: ['https://cdn.example.com/cat.png'],
			emitted: [[COPIED_MESSAGE]],
			rowClicked: false,
		});
	});
});
