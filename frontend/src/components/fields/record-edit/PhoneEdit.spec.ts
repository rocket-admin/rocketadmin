import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { mockWidgetStructure } from '../stories.mocks';
import PhoneEdit from './PhoneEdit.vue';

type Wrapper = ReturnType<typeof mount>;

// biome-ignore lint/suspicious/noExplicitAny: widget params are free-form per widget type
function mountPhone(value: string | null = '', params: Record<string, any> = {}) {
	return mount(PhoneEdit, {
		props: { label: 'phone', fieldKey: 'phone', value, widgetStructure: mockWidgetStructure(params) },
		attachTo: document.body,
	});
}

const phoneInput = (wrapper: Wrapper) => wrapper.find('[data-testid="record-phone-phone"]');
const phoneValue = (wrapper: Wrapper) => (phoneInput(wrapper).element as HTMLInputElement).value;
const countryInput = (wrapper: Wrapper) => wrapper.find('input[role="combobox"]');
const countryValue = (wrapper: Wrapper) => (countryInput(wrapper).element as HTMLInputElement).value;
const lastEmitted = (wrapper: Wrapper) => wrapper.emitted('fieldChange')?.at(-1)?.[0];

async function pickCountry(wrapper: Wrapper, search: string, name: string) {
	await countryInput(wrapper).setValue(search);
	const option = wrapper.findAll('[role="option"]').find((o) => o.text().includes(name));
	await option?.trigger('click');
}

describe('PhoneEdit', () => {
	it('defaults to the first preferred country with an empty number', () => {
		const wrapper = mountPhone('');
		expect(countryValue(wrapper)).toBe('🇺🇸 United States +1');
		expect(phoneValue(wrapper)).toBe('');
		expect(wrapper.text()).toContain('Example: (202) 456-1111');
		expect(phoneInput(wrapper).attributes('placeholder')).toBe('Local number or +11234567890');
		expect(wrapper.emitted('fieldChange')).toBeUndefined();
		wrapper.unmount();
	});

	it('parses an existing international number', () => {
		const wrapper = mountPhone('+442079460958');
		expect(countryValue(wrapper)).toBe('🇬🇧 United Kingdom +44');
		expect(phoneValue(wrapper)).toBe('020 7946 0958');
		wrapper.unmount();
	});

	it('parses an existing national number with the default country', () => {
		const wrapper = mountPhone('2024561111');
		expect(countryValue(wrapper)).toContain('United States');
		expect(phoneValue(wrapper)).toBe('(202) 456-1111');
		wrapper.unmount();
	});

	describe('US formatting', () => {
		it.each([
			['(202) 456-1111'],
			['2024561111'],
			['202.456.1111'],
			['+1 202 456 1111'],
		])('stores %s as E.164', async (typed) => {
			const wrapper = mountPhone('');
			await phoneInput(wrapper).setValue(typed);
			expect(lastEmitted(wrapper)).toBe('+12024561111');
			wrapper.unmount();
		});

		it('formats as you type', async () => {
			const wrapper = mountPhone('');
			await phoneInput(wrapper).setValue('2024561111');
			await wrapper.vm.$nextTick();
			expect(phoneValue(wrapper)).toBe('(202) 456-1111');
			wrapper.unmount();
		});

		it('does not turn an invalid number into a malformed international one', async () => {
			const wrapper = mountPhone('');
			await phoneInput(wrapper).setValue('123');
			expect(lastEmitted(wrapper)).not.toBe('+1123');
			expect(wrapper.text()).toContain('Invalid phone number format');
			wrapper.unmount();
		});
	});

	it('formats UK and German local numbers after picking the country', async () => {
		const uk = mountPhone('');
		await pickCountry(uk, 'United K', 'United Kingdom');
		await phoneInput(uk).setValue('020 7946 0958');
		expect(lastEmitted(uk)).toBe('+442079460958');
		uk.unmount();

		const de = mountPhone('');
		await pickCountry(de, 'germ', 'Germany');
		expect(countryValue(de)).toBe('🇩🇪 Germany +49');
		await phoneInput(de).setValue('030 12345678');
		expect(lastEmitted(de)).toBe('+493012345678');
		de.unmount();
	});

	it('detects the country from an international number', async () => {
		const wrapper = mountPhone('');
		await phoneInput(wrapper).setValue('+442079460958');
		expect(countryValue(wrapper)).toBe('🇬🇧 United Kingdom +44');
		expect(lastEmitted(wrapper)).toBe('+442079460958');
		await wrapper.vm.$nextTick();
		expect(phoneValue(wrapper)).toBe('020 7946 0958');
		wrapper.unmount();
	});

	it('emits "" when the number is cleared', async () => {
		const wrapper = mountPhone('+12024561111');
		await phoneInput(wrapper).setValue('');
		expect(wrapper.emitted('fieldChange')).toEqual([['']]);
		wrapper.unmount();
	});

	it('survives garbage input', async () => {
		const wrapper = mountPhone('');
		await phoneInput(wrapper).setValue('not-a-phone-number');
		expect(wrapper.emitted('fieldChange')).toHaveLength(1);
		wrapper.unmount();
	});

	describe('country search', () => {
		const optionTexts = async (search: string) => {
			const wrapper = mountPhone('');
			await countryInput(wrapper).setValue(search);
			const texts = wrapper.findAll('[role="option"]').map((o) => o.text());
			wrapper.unmount();
			return texts;
		};

		it('filters by name, code and dial code', async () => {
			expect((await optionTexts('United')).some((t) => t.includes('United States'))).toBe(true);
			expect((await optionTexts('us')).some((t) => t.includes('United States'))).toBe(true);
			expect((await optionTexts('+380'))[0]).toContain('Ukraine');
		});

		it('lists preferred countries first', async () => {
			const wrapper = mountPhone('', { preferred_countries: ['CA', 'GB'] });
			await countryInput(wrapper).trigger('focus');
			const texts = wrapper.findAll('[role="option"]').map((o) => o.text());
			expect(texts[0]).toContain('Canada');
			expect(texts[1]).toContain('United Kingdom');
			expect(countryValue(wrapper)).toContain('Canada');
			wrapper.unmount();
		});
	});

	it('shows the fallback example for a country without one', () => {
		const wrapper = mountPhone('', { preferred_countries: ['UA'] });
		expect(wrapper.text()).toContain('Example: +380 123 4567');
		wrapper.unmount();
	});

	it('honours enable_placeholder and phone_validation', async () => {
		const wrapper = mountPhone('', { enable_placeholder: false, phone_validation: false });
		expect(phoneInput(wrapper).attributes('placeholder')).toBe('');
		await phoneInput(wrapper).setValue('123');
		expect(wrapper.text()).not.toContain('Invalid phone number format');
		wrapper.unmount();
	});

	it('passes readonly and disabled to both inputs', () => {
		const wrapper = mount(PhoneEdit, { props: { label: 'phone', readonly: true, disabled: true } });
		for (const input of wrapper.findAll('input').map((i) => i.element as HTMLInputElement)) {
			expect([input.readOnly, input.disabled]).toEqual([true, true]);
		}
	});
});
