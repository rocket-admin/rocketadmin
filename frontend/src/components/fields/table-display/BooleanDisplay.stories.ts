import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { mockStructure, mockWidgetStructure } from '../stories.mocks';
import BooleanDisplay from './BooleanDisplay.vue';

const meta = {
	title: 'Table Display Fields/Boolean',
	component: BooleanDisplay,
	tags: ['autodocs'],
	args: {
		fieldKey: 'field_name',
		value: true,
		structure: mockStructure({ data_type: 'boolean', character_maximum_length: 255 }),
		widgetStructure: mockWidgetStructure(),
		rowData: { field_name: true },
		primaryKeys: [{ column_name: 'id' }],
	},
} satisfies Meta<typeof BooleanDisplay>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = {
	args: { value: null },
};

export const False: Story = { args: { value: false } };
export const InvertedColors: Story = { args: { widgetStructure: mockWidgetStructure({ invert_colors: true }) } };
