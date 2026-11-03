import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { mockWidgetStructure } from '../stories.mocks';
import LongTextFilter from './LongTextFilter.vue';

describe('LongTextFilter', () => {
	it('renders a textarea with the value, 4 rows by default', () => {
		const wrapper = mount(LongTextFilter, { props: { label: 'notes', value: 'abc' } });
		const textarea = wrapper.find('[data-testid="record-notes-long-text"]').element as HTMLTextAreaElement;
		expect(textarea.tagName).toBe('TEXTAREA');
		expect(textarea.value).toBe('abc');
		expect(textarea.rows).toBe(4);
	});

	it('takes rows from widget params, given as an object or a JSON string', () => {
		const fromObject = mount(LongTextFilter, {
			props: { label: 'notes', widgetStructure: mockWidgetStructure({ rows: 8 }) },
		});
		expect((fromObject.find('textarea').element as HTMLTextAreaElement).rows).toBe(8);

		const widget = mockWidgetStructure();
		widget.widget_params = '{"rows": 6}' as unknown as Record<string, unknown>;
		const fromString = mount(LongTextFilter, { props: { label: 'notes', widgetStructure: widget } });
		expect((fromString.find('textarea').element as HTMLTextAreaElement).rows).toBe(6);
	});

	it('emits fieldChange with the text', async () => {
		const wrapper = mount(LongTextFilter, { props: { label: 'notes' } });
		await wrapper.find('textarea').setValue('long');
		expect(wrapper.emitted('fieldChange')).toEqual([['long']]);
	});
});
