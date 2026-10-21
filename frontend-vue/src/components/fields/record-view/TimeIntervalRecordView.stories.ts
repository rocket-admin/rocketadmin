import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { mockStructure, mockWidgetStructure } from '../stories.mocks';
import TimeIntervalRecordView from './TimeIntervalRecordView.vue';

const meta = {
	title: 'Record View Fields/TimeInterval',
	component: TimeIntervalRecordView,
	tags: ['autodocs'],
	args: {
		fieldKey: 'field_name',
		value: '01:30:00',
		structure: mockStructure({ data_type: 'interval', character_maximum_length: 255 }),
		widgetStructure: mockWidgetStructure(),
		rowData: { field_name: '01:30:00' },
		primaryKeys: { id: 1 },
	},
} satisfies Meta<typeof TimeIntervalRecordView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = {
	args: { value: null },
};

export const IntervalObject: Story = { args: { value: { hours: 1, minutes: 30 } } };
