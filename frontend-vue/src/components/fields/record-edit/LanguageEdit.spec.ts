import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { type AutocompleteOption, UiAutocomplete } from '@/components/ui';
import { mockStructure, mockWidgetStructure } from '../stories.mocks';
import LanguageEdit from './LanguageEdit.vue';

type Option = AutocompleteOption<{ value: string | null; label: string; flag: string; nativeName?: string }>;
const options = (wrapper: ReturnType<typeof mount>) =>
	(wrapper.findComponent(UiAutocomplete).props() as unknown as { options: Option[] }).options;
const input = (wrapper: ReturnType<typeof mount>) => wrapper.find('input').element as HTMLInputElement;
const notNull = mockStructure({ allow_null: false });

describe('LanguageEdit', () => {
	it('lists the languages sorted by name', () => {
		const wrapper = mount(LanguageEdit, {
			props: { label: 'lang', structure: notNull, widgetStructure: mockWidgetStructure() },
		});
		const labels = options(wrapper).map((o) => o.label);
		expect(labels.length).toBeGreaterThan(100);
		expect(labels).toEqual([...labels].sort((a, b) => a.localeCompare(b)));
	});

	it('shows the current language, matching the code case-insensitively', () => {
		const wrapper = mount(LanguageEdit, { props: { label: 'lang', structure: notNull, value: 'EN' } });
		expect(input(wrapper).value).toBe('English');
		expect(wrapper.find('.language-edit__flag-prefix').exists()).toBe(true);
	});

	it('hides the flag with show_flag: false', () => {
		const wrapper = mount(LanguageEdit, {
			props: { label: 'lang', value: 'en', widgetStructure: mockWidgetStructure({ show_flag: false }) },
		});
		expect(wrapper.find('.language-edit__flag-prefix').exists()).toBe(false);
	});

	it('filters by native name too', async () => {
		const wrapper = mount(LanguageEdit, { props: { label: 'lang', structure: notNull } });
		await wrapper.find('input').setValue('deutsch');
		expect(options(wrapper).map((o) => o.value.value)).toContain('de');
	});

	it('prepends an empty option for allow_null and emits null for it', () => {
		const wrapper = mount(LanguageEdit, {
			props: { label: 'lang', structure: notNull, widgetStructure: mockWidgetStructure({ allow_null: true }) },
		});
		const first = options(wrapper)[0];
		expect(first?.value.value).toBeNull();
		wrapper.findComponent(UiAutocomplete).vm.$emit('select', first);
		expect(wrapper.emitted('fieldChange')).toEqual([[null]]);
	});

	it('emits the picked code', () => {
		const wrapper = mount(LanguageEdit, { props: { label: 'lang', structure: notNull } });
		const french = options(wrapper).find((o) => o.value.value === 'fr');
		wrapper.findComponent(UiAutocomplete).vm.$emit('select', french);
		expect(wrapper.emitted('fieldChange')).toEqual([['fr']]);
	});
});
