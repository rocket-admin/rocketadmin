import { mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { COPIED_MESSAGE } from '../useFieldWidget';
import LanguageDisplay from './LanguageDisplay.vue';
import { cellText, setupCopy, widget } from './testing';

describe('LanguageDisplay', () => {
	afterEach(() => vi.unstubAllGlobals());

	it('shows the language name and flag for a code, case-insensitively', () => {
		const wrapper = mount(LanguageDisplay, { props: { value: 'FR' } });
		expect(cellText(wrapper)).toContain('French');
		expect(wrapper.find('.language-display__flag').exists()).toBe(true);
	});

	it('falls back to the raw value for an unknown code', () => {
		expect(cellText(mount(LanguageDisplay, { props: { value: 'zz-unknown' } }))).toBe('zz-unknown');
	});

	it('shows a dash for null', () => {
		expect(cellText(mount(LanguageDisplay, { props: { value: null } }))).toBe('—');
	});

	it('hides the flag with show_flag: false', () => {
		const wrapper = mount(LanguageDisplay, { props: { value: 'en', widgetStructure: widget({ show_flag: false }) } });
		expect(wrapper.find('.language-display__flag').exists()).toBe(false);
	});

	it('copies the language name', async () => {
		const { attachTo, clickCopy } = setupCopy();
		const result = await clickCopy(mount(LanguageDisplay, { props: { value: 'fr' }, attachTo }));
		expect(result).toEqual({ copied: ['French'], emitted: [[COPIED_MESSAGE]], rowClicked: false });
	});
});
