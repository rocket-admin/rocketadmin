import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { mockStructure } from '../stories.mocks';
import CountryFilter from './CountryFilter.vue';

const structure = mockStructure({ allow_null: false });

function optionTexts(wrapper: ReturnType<typeof mount>) {
	return wrapper.findAll('[role="option"]').map((option) => option.text());
}

describe('CountryFilter', () => {
	it('shows the name of the country in the value', () => {
		const wrapper = mount(CountryFilter, { props: { label: 'country', value: 'US', structure } });
		const input = wrapper.find('[data-testid="record-country-country"]').element as HTMLInputElement;
		expect(input.value).toBe('United States');
	});

	it('filters by name or code as you type', async () => {
		const wrapper = mount(CountryFilter, { props: { label: 'country', structure } });
		await wrapper.find('input').setValue('germ');
		expect(optionTexts(wrapper)).toEqual([expect.stringContaining('Germany')]);
		await wrapper.find('input').setValue('fr');
		expect(optionTexts(wrapper).some((text) => text.includes('France') && text.includes('(FR)'))).toBe(true);
	});

	it('emits the code of the picked country', async () => {
		const wrapper = mount(CountryFilter, { props: { label: 'country', structure } });
		await wrapper.find('input').setValue('Germany');
		await wrapper.find('[role="option"]').trigger('click');
		expect(wrapper.emitted('fieldChange')).toEqual([['DE']]);
		expect((wrapper.find('input').element as HTMLInputElement).value).toBe('Germany');
	});

	it('offers an empty null option for nullable columns', async () => {
		const wrapper = mount(CountryFilter, {
			props: { label: 'country', structure: mockStructure({ allow_null: true }) },
		});
		await wrapper.find('input').trigger('focus');
		await wrapper.find('[role="option"]').trigger('click');
		expect(wrapper.emitted('fieldChange')).toEqual([[null]]);
	});
});
