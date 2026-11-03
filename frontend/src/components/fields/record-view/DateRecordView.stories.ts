import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { mockStructure, mockWidgetStructure } from '../stories.mocks';
import DateRecordView from './DateRecordView.vue';

const meta = {
	title: 'Record View Fields/Date',
	component: DateRecordView,
	tags: ['autodocs'],
	args: {
		fieldKey: 'field_name',
		value: '2024-01-15',
		structure: mockStructure({ data_type: 'date', character_maximum_length: 255 }),
		widgetStructure: mockWidgetStructure(),
		rowData: { field_name: '2024-01-15' },
		primaryKeys: { id: 1 },
	},
} satisfies Meta<typeof DateRecordView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = {
	args: { value: null },
};
