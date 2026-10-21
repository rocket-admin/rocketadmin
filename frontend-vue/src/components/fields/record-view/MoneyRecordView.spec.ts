import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { mockWidgetStructure } from '../stories.mocks';
import MoneyRecordView from './MoneyRecordView.vue';

const text = (value: unknown, params: Record<string, unknown>) =>
	mount(MoneyRecordView, { props: { value, widgetStructure: mockWidgetStructure(params) } }).text();

describe('MoneyRecordView', () => {
	it('formats the value with the currency symbol', () => {
		expect(text(42.5, { default_currency: 'USD' })).toBe('$42.50');
	});

	it('renders a dash for null', () => {
		expect(text(null, { default_currency: 'USD' })).toBe('—');
	});

	it('uses the currency of an { amount, currency } value', () => {
		expect(text({ amount: 100, currency: 'EUR' }, { default_currency: 'USD' })).toBe('€100.00');
	});

	it('divides cents to major units when cents=true (USD)', () => {
		expect(text(2599, { default_currency: 'USD', cents: true })).toBe('$25.99');
	});

	it('does not divide zero-decimal currencies (JPY)', () => {
		expect(text(1099, { default_currency: 'JPY', cents: true })).toBe('¥1099');
	});

	it('renders a zero amount', () => {
		expect(text(0, { default_currency: 'USD', cents: true })).toBe('$0.00');
	});

	it('treats an object amount as cents when cents=true', () => {
		expect(text({ amount: 1099, currency: 'EUR' }, { default_currency: 'USD', cents: true })).toContain('10.99');
	});

	it('applies decimal_places and needs no currency', () => {
		expect(text('3.14159', { decimal_places: 3 })).toBe('3.142');
	});

	it('renders a dash for a non-numeric value', () => {
		expect(text('abc', { default_currency: 'USD' })).toBe('—');
	});
});
