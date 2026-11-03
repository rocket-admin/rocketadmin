import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { mockStructure, mockWidgetStructure } from '../stories.mocks';
import TimezoneFilter from './TimezoneFilter.vue';

function optionTexts(wrapper: ReturnType<typeof mount>) {
	return wrapper.findAll('option').map((option) => option.text());
}

describe('TimezoneFilter', () => {
	it('lists the Intl timezones with their UTC offset', () => {
		const wrapper = mount(TimezoneFilter, { props: { label: 'tz', structure: mockStructure({ allow_null: false }) } });
		const texts = optionTexts(wrapper);
		expect(texts.length).toBeGreaterThan(10);
		expect(texts.find((text) => text.startsWith('Europe/London'))).toMatch(/\(UTC[+-]\d{2}:\d{2}\)$/);
	});

	it('selects the value and emits a new choice', async () => {
		const wrapper = mount(TimezoneFilter, {
			props: { label: 'tz', value: 'Europe/London', structure: mockStructure({ allow_null: false }) },
		});
		const select = wrapper.find('[data-testid="filter-tz-timezone"]');
		const selected = (select.element as HTMLSelectElement).selectedOptions[0];
		expect(selected?.textContent?.trim()).toMatch(/^Europe\/London \(UTC/);

		const tokyo = wrapper.findAll('option').find((option) => option.text().startsWith('Asia/Tokyo'));
		await select.setValue(tokyo?.attributes('value'));
		expect(wrapper.emitted('fieldChange')).toEqual([['Asia/Tokyo']]);
	});

	it('adds an empty null option for allow_null in widget params', async () => {
		const wrapper = mount(TimezoneFilter, {
			props: {
				label: 'tz',
				value: 'UTC',
				structure: mockStructure({ allow_null: false }),
				widgetStructure: mockWidgetStructure({ allow_null: true }),
			},
		});
		const first = wrapper.findAll('option')[0];
		expect(first?.text()).toBe('');
		await wrapper.find('select').setValue(first?.attributes('value'));
		expect(wrapper.emitted('fieldChange')).toEqual([[null]]);
	});
});
