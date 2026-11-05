import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { mockStructure, mockWidgetStructure } from '../stories.mocks';
import SelectEdit from './SelectEdit.vue';

const optionTexts = (wrapper: ReturnType<typeof mount>) => wrapper.findAll('option').map((o) => o.text());

describe('SelectEdit', () => {
	it('has no options without a widget or structure', () => {
		const wrapper = mount(SelectEdit, { props: { label: 'status' } });
		expect(wrapper.findAll('option')).toHaveLength(0);
	});

	it('loads options from widget_params', () => {
		const options = [
			{ value: 'opt1', label: 'Option 1' },
			{ value: 'opt2', label: 'Option 2' },
		];
		const wrapper = mount(SelectEdit, {
			props: { label: 'status', widgetStructure: mockWidgetStructure({ options }) },
		});
		expect(optionTexts(wrapper)).toEqual(['Option 1', 'Option 2']);
	});

	it('prepends an empty option when widget allow_null is set', () => {
		const wrapper = mount(SelectEdit, {
			props: {
				label: 'status',
				widgetStructure: mockWidgetStructure({ options: [{ value: 'opt1', label: 'Option 1' }], allow_null: true }),
			},
		});
		expect(optionTexts(wrapper)).toEqual(['', 'Option 1']);
	});

	it('loads options from the enum data_type_params', () => {
		const wrapper = mount(SelectEdit, {
			props: {
				label: 'status',
				structure: mockStructure({ data_type_params: ['active', 'inactive', 'pending'], allow_null: false }),
			},
		});
		expect(optionTexts(wrapper)).toEqual(['active', 'inactive', 'pending']);
	});

	it('prepends an empty option for a nullable enum', () => {
		const wrapper = mount(SelectEdit, {
			props: {
				label: 'status',
				structure: mockStructure({ data_type_params: ['active', 'inactive'], allow_null: true }),
			},
		});
		expect(optionTexts(wrapper)).toEqual(['', 'active', 'inactive']);
	});

	it('selects the value and emits the chosen option value, null for the empty option', async () => {
		const wrapper = mount(SelectEdit, {
			props: {
				label: 'status',
				value: 'inactive',
				structure: mockStructure({ data_type_params: ['active', 'inactive'], allow_null: true }),
			},
		});
		const select = wrapper.find('[data-testid="record-status-select"]');
		expect((select.element as HTMLSelectElement).selectedIndex).toBe(2);
		await select.setValue('1');
		await select.setValue('0');
		expect(wrapper.emitted('fieldChange')).toEqual([['active'], [null]]);
	});

	it('disables the select when disabled or readonly', () => {
		const wrapper = mount(SelectEdit, { props: { label: 'status', readonly: true } });
		expect((wrapper.find('select').element as HTMLSelectElement).disabled).toBe(true);
	});
});
