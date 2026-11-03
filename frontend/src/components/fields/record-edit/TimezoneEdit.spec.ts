import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { mockStructure, mockWidgetStructure } from '../stories.mocks';
import TimezoneEdit from './TimezoneEdit.vue';

describe('TimezoneEdit', () => {
	it('lists the Intl timezones with their UTC offset', () => {
		const wrapper = mount(TimezoneEdit, { props: { label: 'tz' } });
		const labels = wrapper.findAll('option').map((o) => o.text());
		expect(labels.length).toBeGreaterThan(0);
		expect(labels.find((l) => l.startsWith('America/New_York'))).toMatch(/\(UTC[+-]\d\d:\d\d\)$/);
	});

	it('selects the value and emits the chosen zone', async () => {
		const wrapper = mount(TimezoneEdit, { props: { label: 'tz', value: 'Europe/Paris' } });
		const select = wrapper.find('[data-testid="record-tz-timezone"]').element as HTMLSelectElement;
		expect(select.selectedOptions[0]?.textContent).toContain('Europe/Paris');

		const index = Array.from(select.options).findIndex((o) => o.textContent?.startsWith('America/New_York'));
		await wrapper.find('select').setValue(String(index));
		expect(wrapper.emitted('fieldChange')).toEqual([['America/New_York']]);
	});

	it('adds an empty option when widget allow_null is set', async () => {
		const wrapper = mount(TimezoneEdit, {
			props: {
				label: 'tz',
				structure: mockStructure({ allow_null: false }),
				widgetStructure: mockWidgetStructure({ allow_null: true }),
			},
		});
		expect(wrapper.find('option').text()).toBe('');
		await wrapper.find('select').setValue('0');
		expect(wrapper.emitted('fieldChange')).toEqual([[null]]);
	});

	it('adds an empty option for a nullable column', () => {
		const wrapper = mount(TimezoneEdit, { props: { label: 'tz', structure: mockStructure({ allow_null: true }) } });
		expect(wrapper.find('option').text()).toBe('');
	});

	it('has no empty option for a non-nullable column', () => {
		const wrapper = mount(TimezoneEdit, { props: { label: 'tz', structure: mockStructure({ allow_null: false }) } });
		expect(wrapper.find('option').text()).not.toBe('');
	});
});
