import { mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import BinaryDisplay from './BinaryDisplay.vue';
import { cellText, setupCopy, widget } from './testing';

describe('BinaryDisplay', () => {
	afterEach(() => vi.unstubAllGlobals());

	it('shows a dash and no copy button for an empty value', () => {
		const wrapper = mount(BinaryDisplay, { props: { value: null } });
		expect(cellText(wrapper)).toBe('—');
		expect(wrapper.find('button').exists()).toBe(false);
	});

	it('shows a server string as char-code-per-byte hex', () => {
		expect(cellText(mount(BinaryDisplay, { props: { value: 'Hel' } }))).toBe('48656c');
	});

	it('shows a Buffer JSON value as hex', () => {
		expect(cellText(mount(BinaryDisplay, { props: { value: { type: 'Buffer', data: [0x48, 0x65, 0x6c] } } }))).toBe(
			'48656c',
		);
	});

	it('truncates long output at 20 characters', () => {
		expect(cellText(mount(BinaryDisplay, { props: { value: 'ª'.repeat(30) } }))).toBe(`${'aa'.repeat(10)}…`);
	});

	it('honours the encoding param and falls back to hex for unknown ones', () => {
		const render = (encoding: string, value: string | { type: string; data: number[] }) =>
			cellText(mount(BinaryDisplay, { props: { value, widgetStructure: widget({ encoding }) } }));
		expect(render('base64', 'Hello')).toBe('SGVsbG8=');
		expect(render('ascii', { type: 'Buffer', data: [0x48, 0x00, 0x69] })).toBe('H.i');
		expect(render('utf8', 'Hi')).toBe('4869');
	});

	it('labels the copy button with the encoding', () => {
		const wrapper = mount(BinaryDisplay, { props: { value: 'Hi', widgetStructure: widget({ encoding: 'base64' }) } });
		expect(wrapper.get('button').attributes('aria-label')).toBe('Copy base64');
	});

	it('copies the full encoded value', async () => {
		const { attachTo, clickCopy } = setupCopy();
		const result = await clickCopy(mount(BinaryDisplay, { props: { value: 'ª'.repeat(30) }, attachTo }));
		expect(result).toEqual({
			copied: ['aa'.repeat(30)],
			emitted: [['Binary data was copied to clipboard.']],
			rowClicked: false,
		});
	});
});
