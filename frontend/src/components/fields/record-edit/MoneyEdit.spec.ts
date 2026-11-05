import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import type { MoneyValue } from '@/consts/currencies';
import { mockWidgetStructure } from '../stories.mocks';
import MoneyEdit from './MoneyEdit.vue';

// biome-ignore lint/suspicious/noExplicitAny: widget params are free-form per widget type
function mountMoney(value?: string | number | MoneyValue | null, params: Record<string, any> = {}) {
	return mount(MoneyEdit, { props: { label: 'price', value, widgetStructure: mockWidgetStructure(params) } });
}

const amountInput = (wrapper: ReturnType<typeof mount>) => wrapper.find('[data-testid="record-price-money-amount"]');
const amountValue = (wrapper: ReturnType<typeof mount>) => (amountInput(wrapper).element as HTMLInputElement).value;
const symbol = (wrapper: ReturnType<typeof mount>) => wrapper.find('.money-edit__symbol');
const currencySelect = (wrapper: ReturnType<typeof mount>) =>
	wrapper.find('[data-testid="record-price-money-selector"]');

/** Picks a currency by code in the native select (options carry their index). */
async function pickCurrency(wrapper: ReturnType<typeof mount>, code: string) {
	const select = currencySelect(wrapper);
	const index = Array.from((select.element as HTMLSelectElement).options).findIndex((o) =>
		o.textContent?.includes(` ${code} - `),
	);
	await select.setValue(String(index));
}

describe('MoneyEdit', () => {
	it('defaults to USD without a currency selector', () => {
		const wrapper = mountMoney('');
		expect(currencySelect(wrapper).exists()).toBe(false);
		expect(amountValue(wrapper)).toBe('');
		expect(amountInput(wrapper).attributes('placeholder')).toBe('Enter amount in US Dollar');
		expect(wrapper.find('label').text()).toContain('Price');
	});

	it('parses a "100.50 EUR" string', () => {
		const wrapper = mountMoney('100.50 EUR');
		expect(amountValue(wrapper)).toBe('100.50');
		expect(symbol(wrapper).text()).toBe('€');
		expect(amountInput(wrapper).attributes('placeholder')).toBe('Enter amount in Euro');
	});

	it('detects the currency from its symbol', () => {
		expect(symbol(mountMoney('£12')).text()).toBe('£');
	});

	it('parses an { amount, currency } object', () => {
		const wrapper = mountMoney({ amount: 250.75, currency: 'GBP' }, { show_currency_selector: true });
		expect(amountValue(wrapper)).toBe('250.75');
		expect((currencySelect(wrapper).element as HTMLSelectElement).selectedOptions[0]?.textContent).toContain(
			'GBP - British Pound',
		);
	});

	it('parses a bare number in the default currency', () => {
		const wrapper = mountMoney(150.25);
		expect(amountValue(wrapper)).toBe('150.25');
		expect(symbol(wrapper).text()).toBe('$');
	});

	it('emits the number when the currency selector is off', async () => {
		const wrapper = mountMoney('');
		await amountInput(wrapper).setValue('123.45');
		expect(wrapper.emitted('fieldChange')).toEqual([[123.45]]);
	});

	it('emits { amount, currency } when the currency selector is on', async () => {
		const wrapper = mountMoney('', { show_currency_selector: true });
		await amountInput(wrapper).setValue('123.45');
		expect(wrapper.emitted('fieldChange')).toEqual([[{ amount: 123.45, currency: 'USD' }]]);
	});

	it('emits the new currency on change', async () => {
		const wrapper = mountMoney(100, { show_currency_selector: true });
		await pickCurrency(wrapper, 'EUR');
		expect(wrapper.emitted('fieldChange')).toEqual([[{ amount: 100, currency: 'EUR' }]]);
	});

	it('strips letters and formats on blur', async () => {
		const wrapper = mountMoney(100);
		await amountInput(wrapper).setValue('abc123def');
		expect(wrapper.emitted('fieldChange')).toEqual([[123]]);
		await amountInput(wrapper).trigger('blur');
		expect(amountValue(wrapper)).toBe('123.00');
	});

	it('clears the amount and emits "" for all-letter input', async () => {
		const wrapper = mountMoney(100);
		await amountInput(wrapper).setValue('invalid');
		await wrapper.vm.$nextTick();
		expect(amountValue(wrapper)).toBe('');
		expect(wrapper.emitted('fieldChange')).toEqual([['']]);
	});

	it('drops the minus sign when allow_negative is false', async () => {
		const wrapper = mountMoney('', { allow_negative: false });
		await amountInput(wrapper).setValue('-123.45');
		expect(wrapper.emitted('fieldChange')).toEqual([[123.45]]);
	});

	it('uses decimal_places for formatting', () => {
		const wrapper = mountMoney(1.23456, { decimal_places: 3 });
		expect(amountValue(wrapper)).toBe('1.235');
	});

	it('hides the symbol while empty', () => {
		expect(symbol(mountMoney('')).exists()).toBe(false);
	});

	describe('cents', () => {
		it('loads a USD minor-unit number as major units', () => {
			expect(amountValue(mountMoney(1099, { default_currency: 'USD', cents: true }))).toBe('10.99');
		});

		it('loads JPY without division and with 0 decimals', () => {
			const wrapper = mountMoney(
				{ amount: 1099, currency: 'JPY' },
				{ default_currency: 'JPY', cents: true, show_currency_selector: true },
			);
			expect(amountValue(wrapper)).toBe('1099');
		});

		it('emits integer cents', async () => {
			const wrapper = mountMoney('', { default_currency: 'USD', cents: true });
			await amountInput(wrapper).setValue('10.99');
			await amountInput(wrapper).setValue('20.99');
			expect(wrapper.emitted('fieldChange')).toEqual([[1099], [2099]]);
		});

		it('rounds and reformats on a switch to a zero-decimal currency', async () => {
			const wrapper = mountMoney(
				{ amount: 1099, currency: 'USD' },
				{ default_currency: 'USD', cents: true, show_currency_selector: true },
			);
			expect(amountValue(wrapper)).toBe('10.99');
			await pickCurrency(wrapper, 'JPY');
			expect(amountValue(wrapper)).toBe('11');
			expect(wrapper.emitted('fieldChange')).toEqual([[{ amount: 11, currency: 'JPY' }]]);
		});

		it('keeps legacy behaviour without cents', () => {
			expect(amountValue(mountMoney(10.99, { default_currency: 'USD' }))).toBe('10.99');
		});
	});

	it('passes disabled and readonly through', () => {
		const wrapper = mount(MoneyEdit, {
			props: {
				label: 'price',
				disabled: true,
				readonly: true,
				widgetStructure: mockWidgetStructure({ show_currency_selector: true }),
			},
		});
		const input = amountInput(wrapper).element as HTMLInputElement;
		expect([input.disabled, input.readOnly]).toEqual([true, true]);
		expect((currencySelect(wrapper).element as HTMLSelectElement).disabled).toBe(true);
	});
});
