import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { mockWidgetStructure } from '../stories.mocks';
import SelectRecordView from './SelectRecordView.vue';

const options = [
	{ value: 'a', label: 'Alpha', background_color: 'rgb(255, 0, 0)' },
	{ value: 'b', label: 'Beta' },
];

describe('SelectRecordView', () => {
	it('renders a dash for null', () => {
		expect(mount(SelectRecordView, { props: { value: null } }).text()).toBe('—');
	});

	it('renders the matching option label on its background colour', () => {
		const wrapper = mount(SelectRecordView, {
			props: { value: 'a', widgetStructure: mockWidgetStructure({ options }) },
		});
		expect(wrapper.text()).toBe('Alpha');
		expect((wrapper.element as HTMLElement).style.backgroundColor).toBe('rgb(255, 0, 0)');
	});

	it('uses a transparent background for an option without a colour', () => {
		const wrapper = mount(SelectRecordView, {
			props: { value: 'b', widgetStructure: mockWidgetStructure({ options }) },
		});
		expect((wrapper.element as HTMLElement).style.backgroundColor).toBe('transparent');
	});

	it('renders the raw value when no option matches', () => {
		const wrapper = mount(SelectRecordView, {
			props: { value: 'unknown', widgetStructure: mockWidgetStructure({ options }) },
		});
		expect(wrapper.text()).toBe('unknown');
	});

	it('renders the raw value without options', () => {
		expect(mount(SelectRecordView, { props: { value: 'x' } }).text()).toBe('x');
	});
});
