import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import type { WidgetStructure } from '@/models/table';
import { mockStructure, mockWidgetStructure } from '../stories.mocks';
import LongTextEdit from './LongTextEdit.vue';

const textarea = (wrapper: ReturnType<typeof mount>) => wrapper.find('textarea').element as HTMLTextAreaElement;

describe('LongTextEdit', () => {
	it('renders the label, the value and the test id', () => {
		const wrapper = mount(LongTextEdit, { props: { label: 'bio', value: 'Hello' } });
		expect(wrapper.find('label').text()).toContain('Bio');
		expect((wrapper.find('[data-testid="record-bio-long-text"]').element as HTMLTextAreaElement).value).toBe('Hello');
	});

	it('defaults to 4 rows and reads rows from params (object or string)', () => {
		expect(textarea(mount(LongTextEdit, { props: { label: 'bio' } })).rows).toBe(4);
		expect(
			textarea(mount(LongTextEdit, { props: { label: 'bio', widgetStructure: mockWidgetStructure({ rows: '10' }) } }))
				.rows,
		).toBe(10);
		const stringParams = {
			...mockWidgetStructure(),
			widget_params: JSON.stringify({ rows: '6' }),
		} as unknown as WidgetStructure;
		expect(textarea(mount(LongTextEdit, { props: { label: 'bio', widgetStructure: stringParams } })).rows).toBe(6);
	});

	it('sets maxlength from the column and shows the counter near the limit', () => {
		const wrapper = mount(LongTextEdit, {
			props: { label: 'bio', value: 'abc', structure: mockStructure({ character_maximum_length: 50 }) },
		});
		expect(textarea(wrapper).maxLength).toBe(50);
		expect(wrapper.text()).toContain('3 / 50');
	});

	it('has no maxlength or counter without a column limit', () => {
		const wrapper = mount(LongTextEdit, { props: { label: 'bio', value: 'abc', structure: mockStructure() } });
		expect(wrapper.find('textarea').attributes('maxlength')).toBeUndefined();
		expect(wrapper.text()).not.toContain('/');
	});

	it('emits the typed text as-is, including an empty string', async () => {
		const wrapper = mount(LongTextEdit, {
			props: { label: 'bio', value: 'x', structure: mockStructure({ allow_null: true }) },
		});
		await wrapper.find('textarea').setValue('');
		expect(wrapper.emitted('fieldChange')).toEqual([['']]);
	});

	it('shows the required error once edited', async () => {
		const wrapper = mount(LongTextEdit, { props: { label: 'bio', value: 'x', required: true } });
		expect(wrapper.text()).not.toContain('This field is required.');
		await wrapper.find('textarea').setValue('');
		expect(wrapper.text()).toContain('This field is required.');
	});

	it.each([
		[{ validate: 'isJSON' }, '{', 'Invalid JSON'],
		[{ validate: 'regex', regex: '^\\d+$' }, 'abc', "Value doesn't match the required pattern"],
	])('validates with %j', async (params, input, message) => {
		const wrapper = mount(LongTextEdit, { props: { label: 'bio', widgetStructure: mockWidgetStructure(params) } });
		await wrapper.find('textarea').setValue(input);
		expect(wrapper.text()).toContain(message);
		expect(textarea(wrapper).checkValidity()).toBe(false);
	});
});
