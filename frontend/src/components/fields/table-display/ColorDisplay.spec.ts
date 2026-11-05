import { mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ColorDisplay from './ColorDisplay.vue';
import { setupCopy } from './testing';

const swatch = (value: string | null) => mount(ColorDisplay, { props: { value } }).find('.color-display__swatch');

describe('ColorDisplay', () => {
	afterEach(() => vi.unstubAllGlobals());

	it('shows a swatch for a valid colour', () => {
		expect(swatch('#ff0000').exists()).toBe(true);
		expect(swatch('red').attributes('style')).toContain('background-color: rgb(255, 0, 0)');
	});

	it('shows no swatch for an invalid or empty colour', () => {
		expect(swatch('not-a-color').exists()).toBe(false);
		expect(swatch(null).exists()).toBe(false);
	});

	it('accepts hex without a hash', () => {
		expect(swatch('ff0000').attributes('style')).toContain('background-color: rgb(255, 0, 0)');
	});

	it('displays the value, or a dash', () => {
		expect(
			mount(ColorDisplay, { props: { value: '#FF5733' } })
				.get('.color-display__value')
				.text(),
		).toBe('#FF5733');
		expect(
			mount(ColorDisplay, { props: { value: null } })
				.get('.color-display__value')
				.text(),
		).toBe('—');
	});

	it('copies the value', async () => {
		const { attachTo, clickCopy } = setupCopy();
		const result = await clickCopy(mount(ColorDisplay, { props: { value: '#abc' }, attachTo }));
		expect(result).toEqual({
			copied: ['#abc'],
			emitted: [['Color value was copied to clipboard.']],
			rowClicked: false,
		});
	});
});
