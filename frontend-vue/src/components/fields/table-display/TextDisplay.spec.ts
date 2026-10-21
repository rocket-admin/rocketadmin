import { mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { COPIED_MESSAGE } from '../useFieldWidget';
import TextDisplay from './TextDisplay.vue';
import { cellText, setupCopy, widget } from './testing';

describe('TextDisplay', () => {
	afterEach(() => vi.unstubAllGlobals());

	it('displays the value, or a dash when empty', () => {
		expect(cellText(mount(TextDisplay, { props: { value: 'Sample text' } }))).toBe('Sample text');
		expect(cellText(mount(TextDisplay, { props: { value: null } }))).toBe('—');
	});

	it('flags an invalid email with the validator message', () => {
		const wrapper = mount(TextDisplay, {
			props: { value: 'not-an-email', widgetStructure: widget({ validate: 'isEmail' }) },
		});
		const value = wrapper.get('.text-display__value');
		expect(value.classes()).toContain('text-display__value--invalid');
		expect(value.attributes('title')).toBe('Invalid email address');
	});

	it('does not flag a valid email', () => {
		const wrapper = mount(TextDisplay, {
			props: { value: 'user@example.com', widgetStructure: widget({ validate: 'isEmail' }) },
		});
		expect(wrapper.get('.text-display__value').classes()).not.toContain('text-display__value--invalid');
	});

	it('flags a regex mismatch', () => {
		const wrapper = mount(TextDisplay, {
			props: { value: 'abc', widgetStructure: widget({ validate: 'regex', regex: '^\\d+$' }) },
		});
		expect(wrapper.get('.text-display__value').attributes('title')).toBe('Does not match the required pattern');
	});

	it('derives a message for validators without one', () => {
		const wrapper = mount(TextDisplay, { props: { value: 'x', widgetStructure: widget({ validate: 'isPort' }) } });
		expect(wrapper.get('.text-display__value').attributes('title')).toBe('Invalid port');
	});

	it('copies the value without clicking the row', async () => {
		const { attachTo, clickCopy } = setupCopy();
		const result = await clickCopy(mount(TextDisplay, { props: { value: 'hello' }, attachTo }));
		expect(result).toEqual({ copied: ['hello'], emitted: [[COPIED_MESSAGE]], rowClicked: false });
	});
});
