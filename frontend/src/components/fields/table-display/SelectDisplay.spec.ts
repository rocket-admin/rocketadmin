import { mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { COPIED_MESSAGE } from '../useFieldWidget';
import SelectDisplay from './SelectDisplay.vue';
import { cellText, setupCopy, widget } from './testing';

const options = [
	{ value: 'opt1', label: 'Option One', background_color: 'rgb(255, 0, 0)' },
	{ value: 'opt2', label: 'Option Two' },
];

describe('SelectDisplay', () => {
	afterEach(() => vi.unstubAllGlobals());

	it('shows the option label and its background colour', () => {
		const wrapper = mount(SelectDisplay, { props: { value: 'opt1', widgetStructure: widget({ options }) } });
		expect(cellText(wrapper)).toBe('Option One');
		expect(wrapper.get('.select-display__value').attributes('style')).toContain('background-color: rgb(255, 0, 0)');
	});

	it('shows the raw value when no option matches', () => {
		expect(cellText(mount(SelectDisplay, { props: { value: 'unknown', widgetStructure: widget({ options }) } }))).toBe(
			'unknown',
		);
	});

	it('matches a 0 value', () => {
		const zeroOptions = [
			{ value: 0, label: 'Zero' },
			{ value: 1, label: 'One' },
		];
		expect(
			cellText(mount(SelectDisplay, { props: { value: 0, widgetStructure: widget({ options: zeroOptions }) } })),
		).toBe('Zero');
	});

	it('shows a dash for null and undefined, but an empty string as is', () => {
		expect(cellText(mount(SelectDisplay, { props: { value: null } }))).toBe('—');
		expect(cellText(mount(SelectDisplay, { props: {} }))).toBe('—');
		expect(cellText(mount(SelectDisplay, { props: { value: '', widgetStructure: widget({ options }) } }))).toBe('');
	});

	it('shows the raw enum value without widget options', () => {
		expect(cellText(mount(SelectDisplay, { props: { value: 'option1' } }))).toBe('option1');
	});

	it('copies the displayed label', async () => {
		const { attachTo, clickCopy } = setupCopy();
		const result = await clickCopy(
			mount(SelectDisplay, { props: { value: 'opt2', widgetStructure: widget({ options }) }, attachTo }),
		);
		expect(result).toEqual({ copied: ['Option Two'], emitted: [[COPIED_MESSAGE]], rowClicked: false });
	});
});
