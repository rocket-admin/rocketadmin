import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { mockStructure, mockWidgetStructure } from '../stories.mocks';
import TimeRecordView from './TimeRecordView.vue';

const meta = {
	title: 'Record View Fields/Time',
	component: TimeRecordView,
	tags: ['autodocs'],
	args: {
		fieldKey: 'field_name',
		value: '10:30:00',
		structure: mockStructure({ data_type: 'time', character_maximum_length: 255 }),
		widgetStructure: mockWidgetStructure(),
		rowData: { field_name: '10:30:00' },
		primaryKeys: { id: 1 },
	},
} satisfies Meta<typeof TimeRecordView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = {
	args: { value: null },
};
