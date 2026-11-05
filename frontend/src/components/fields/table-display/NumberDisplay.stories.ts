import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { mockStructure, mockWidgetStructure } from '../stories.mocks';
import NumberDisplay from './NumberDisplay.vue';

const meta = {
	title: 'Table Display Fields/Number',
	component: NumberDisplay,
	tags: ['autodocs'],
	args: {
		fieldKey: 'field_name',
		value: 42,
		structure: mockStructure({ data_type: 'integer', character_maximum_length: 255 }),
		widgetStructure: mockWidgetStructure(),
		rowData: { field_name: 42 },
		primaryKeys: [{ column_name: 'id' }],
	},
} satisfies Meta<typeof NumberDisplay>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = {
	args: { value: null },
};

export const WithUnit: Story = { args: { value: 1500, widgetStructure: mockWidgetStructure({ unit: 'm' }) } };
export const OutOfThreshold: Story = {
	args: { value: 150, widgetStructure: mockWidgetStructure({ threshold_min: 0, threshold_max: 100 }) },
};
