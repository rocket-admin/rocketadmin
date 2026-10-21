import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { mockStructure, mockWidgetStructure } from '../stories.mocks';
import NumberRecordView from './NumberRecordView.vue';

const meta = {
	title: 'Record View Fields/Number',
	component: NumberRecordView,
	tags: ['autodocs'],
	args: {
		fieldKey: 'field_name',
		value: 42,
		structure: mockStructure({ data_type: 'int', character_maximum_length: 255 }),
		widgetStructure: mockWidgetStructure(),
		rowData: { field_name: 42 },
		primaryKeys: { id: 1 },
	},
} satisfies Meta<typeof NumberRecordView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = {
	args: { value: null },
};

export const WithUnit: Story = { args: { value: 1500, widgetStructure: mockWidgetStructure({ unit: 'm' }) } };
export const OutOfThreshold: Story = {
	args: { value: 150, widgetStructure: mockWidgetStructure({ threshold_max: 100 }) },
};
