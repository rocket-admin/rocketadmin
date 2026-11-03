import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { mockStructure, mockWidgetStructure } from '../stories.mocks';
import BooleanEdit from './BooleanEdit.vue';

const notNull = mockStructure({ column_name: 'banned', data_type: 'tinyint', allow_null: false });
const nullable = mockStructure({ column_name: 'banned', data_type: 'tinyint', allow_null: true });

const radios = (wrapper: ReturnType<typeof mount>) =>
	wrapper.findAll('input[type="radio"]').map((r) => r.element as HTMLInputElement);

describe('BooleanEdit', () => {
	it.each([
		['anything', true],
		[1, true],
		[true, true],
		[0, false],
		['', false],
		[false, false],
		[null, null],
		[undefined, null],
	])('normalizes %j to %j and emits it on mount', (value, expected) => {
		const wrapper = mount(BooleanEdit, { props: { label: 'banned', structure: notNull, value } });
		expect(wrapper.emitted('fieldChange')).toEqual([[expected]]);
		const [yes, no] = radios(wrapper);
		expect(yes?.checked).toBe(expected === true);
		expect(no?.checked).toBe(expected === false);
	});

	it('treats a missing value as unset', () => {
		const wrapper = mount(BooleanEdit, { props: { label: 'banned' } });
		expect(wrapper.emitted('fieldChange')).toEqual([[null]]);
	});

	it('renders the label and the test id', () => {
		const wrapper = mount(BooleanEdit, { props: { label: 'is_active' } });
		expect(wrapper.text()).toContain('Is active');
		expect(wrapper.find('[data-testid="record-is_active-boolean-radio-group"]').exists()).toBe(true);
	});

	it('emits the picked option', async () => {
		const wrapper = mount(BooleanEdit, { props: { label: 'banned', structure: notNull, value: true } });
		await wrapper.findAll('input[type="radio"]')[1]?.setValue(true);
		expect(wrapper.emitted('fieldChange')?.at(-1)).toEqual([false]);
	});

	it('does not clear a NOT NULL column when the pressed option is clicked again', async () => {
		const wrapper = mount(BooleanEdit, { props: { label: 'banned', structure: notNull, value: true } });
		await wrapper.findAll('input[type="radio"]')[0]?.trigger('click');
		expect(wrapper.emitted('fieldChange')).toEqual([[true]]);
	});

	it('clears a nullable column back to null when the pressed option is clicked again', async () => {
		const wrapper = mount(BooleanEdit, { props: { label: 'banned', structure: nullable, value: true } });
		await wrapper.findAll('input[type="radio"]')[0]?.trigger('click');
		expect(wrapper.emitted('fieldChange')?.at(-1)).toEqual([null]);
		expect(radios(wrapper).some((r) => r.checked)).toBe(false);
	});

	it('treats widget_params.allow_null like a nullable column', async () => {
		const wrapper = mount(BooleanEdit, {
			props: {
				label: 'banned',
				structure: notNull,
				widgetStructure: mockWidgetStructure({ allow_null: true }),
				value: 0,
			},
		});
		await wrapper.findAll('input[type="radio"]')[1]?.trigger('click');
		expect(wrapper.emitted('fieldChange')?.at(-1)).toEqual([null]);
	});

	it('disables the toggle when disabled', () => {
		const wrapper = mount(BooleanEdit, { props: { label: 'banned', disabled: true } });
		expect(radios(wrapper).every((r) => r.disabled)).toBe(true);
	});
});
