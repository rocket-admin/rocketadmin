import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { mockStructure, mockWidgetStructure } from '../stories.mocks';
import PointRecordView from './PointRecordView.vue';

const meta = {
	title: 'Record View Fields/Point',
	component: PointRecordView,
	tags: ['autodocs'],
	args: {
		fieldKey: 'field_name',
		value: '(40.7128, -74.0060)',
		structure: mockStructure({ data_type: 'point', character_maximum_length: 255 }),
		widgetStructure: mockWidgetStructure(),
		rowData: { field_name: '(40.7128, -74.0060)' },
		primaryKeys: { id: 1 },
	},
} satisfies Meta<typeof PointRecordView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = {
	args: { value: null },
};
