import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { type AutocompleteOption, UiAutocomplete } from '@/components/ui';
import { mockStructure, mockWidgetStructure } from '../stories.mocks';
import CountryEdit from './CountryEdit.vue';

const notNull = mockStructure({ column_name: 'country', allow_null: false, character_maximum_length: 2 });

type Option = AutocompleteOption<{ value: string | null; label: string; flag: string }>;
const options = (wrapper: ReturnType<typeof mount>) =>
	(wrapper.findComponent(UiAutocomplete).props() as unknown as { options: Option[] }).options;
const input = (wrapper: ReturnType<typeof mount>) => wrapper.find('input').element as HTMLInputElement;

describe('CountryEdit', () => {
	it('lists the countries sorted by name', () => {
		const wrapper = mount(CountryEdit, { props: { label: 'country', structure: notNull } });
		const labels = options(wrapper).map((o) => o.label);
		expect(labels.length).toBeGreaterThan(100);
		expect(labels).toEqual([...labels].sort((a, b) => a.localeCompare(b)));
		expect(options(wrapper)[0]?.value.value).not.toBeNull();
	});

	it('prepends an empty option for a nullable column', () => {
		const wrapper = mount(CountryEdit, { props: { label: 'country', structure: { ...notNull, allow_null: true } } });
		expect(options(wrapper)[0]?.value).toEqual({ value: null, label: '', flag: '' });
	});

	it('shows the name and flag of the current code', () => {
		const wrapper = mount(CountryEdit, { props: { label: 'country', structure: notNull, value: 'US' } });
		expect(input(wrapper).value).toBe('United States');
		expect(wrapper.text()).toContain('🇺🇸');
	});

	it('hides the flag with show_flag: false', () => {
		const wrapper = mount(CountryEdit, {
			props: { label: 'country', value: 'US', widgetStructure: mockWidgetStructure({ show_flag: false }) },
		});
		expect(wrapper.text()).not.toContain('🇺🇸');
	});

	it('leaves the input empty for an unknown code', () => {
		const wrapper = mount(CountryEdit, { props: { label: 'country', structure: notNull, value: 'XX' } });
		expect(input(wrapper).value).toBe('');
	});

	it('filters by name or code', async () => {
		const wrapper = mount(CountryEdit, { props: { label: 'country', structure: notNull } });
		await wrapper.find('input').setValue('united');
		const filtered = options(wrapper);
		expect(filtered.length).toBeGreaterThan(0);
		for (const o of filtered) expect(`${o.label}${o.value.value}`.toLowerCase()).toContain('united');
		await wrapper.find('input').setValue('fr');
		expect(options(wrapper).some((o) => o.value.value === 'FR')).toBe(true);
	});

	it('emits the code of the picked country, and nothing while typing', async () => {
		const wrapper = mount(CountryEdit, { props: { label: 'country', structure: notNull } });
		await wrapper.find('input').setValue('France');
		expect(wrapper.emitted('fieldChange')).toBeUndefined();
		const france = options(wrapper).find((o) => o.value.value === 'FR');
		wrapper.findComponent(UiAutocomplete).vm.$emit('select', france);
		await wrapper.vm.$nextTick();
		expect(wrapper.emitted('fieldChange')).toEqual([['FR']]);
		expect(wrapper.text()).toContain('🇫🇷');
	});

	it('emits null for the empty option', () => {
		const wrapper = mount(CountryEdit, { props: { label: 'country', structure: { ...notNull, allow_null: true } } });
		wrapper.findComponent(UiAutocomplete).vm.$emit('select', options(wrapper)[0]);
		expect(wrapper.emitted('fieldChange')).toEqual([[null]]);
	});
});
