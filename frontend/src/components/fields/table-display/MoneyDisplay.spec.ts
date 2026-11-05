import { mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { COPIED_MESSAGE } from '../useFieldWidget';
import MoneyDisplay from './MoneyDisplay.vue';
import { cellText, setupCopy, widget } from './testing';

const shown = (value: InstanceType<typeof MoneyDisplay>['$props']['value'], params: Record<string, unknown> = {}) =>
	cellText(mount(MoneyDisplay, { props: { value, widgetStructure: widget(params) } }));

describe('MoneyDisplay', () => {
	afterEach(() => vi.unstubAllGlobals());

	it('formats with the default currency symbol', () => {
		expect(shown(42.5, { default_currency: 'USD' })).toBe('$42.50');
	});

	it('shows a dash for null and empty', () => {
		expect(shown(null)).toBe('—');
		expect(shown('')).toBe('—');
	});

	it('divides minor units with cents: true', () => {
		expect(shown(1099, { default_currency: 'USD', cents: true })).toBe('$10.99');
	});

	it('does not divide zero-decimal currencies, ignoring decimal_places', () => {
		expect(shown(1099, { default_currency: 'JPY', cents: true })).toBe('¥1099');
		expect(shown(500, { default_currency: 'JPY', cents: true, decimal_places: 4 })).toBe('¥500');
	});

	it('renders zero', () => {
		expect(shown(0, { default_currency: 'USD', cents: true })).toBe('$0.00');
	});

	it('honours decimal_places and parses strings', () => {
		expect(shown('12.3456', { decimal_places: 3 })).toBe('12.346');
	});

	it('uses the currency of an { amount, currency } value', () => {
		expect(shown({ amount: 5, currency: 'EUR' }, { default_currency: 'USD' })).toBe('€5.00');
	});

	it('shows a dash for a non-numeric amount', () => {
		expect(shown('abc')).toBe('—');
	});

	it('copies the formatted amount', async () => {
		const { attachTo, clickCopy } = setupCopy();
		const result = await clickCopy(
			mount(MoneyDisplay, { props: { value: 3, widgetStructure: widget({ default_currency: 'USD' }) }, attachTo }),
		);
		expect(result).toEqual({ copied: ['$3.00'], emitted: [[COPIED_MESSAGE]], rowClicked: false });
	});
});
