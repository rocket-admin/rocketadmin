import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { mockStructure, mockWidgetStructure } from '../stories.mocks';
import ColorDisplay from './ColorDisplay.vue';

const meta = {
	title: 'Table Display Fields/Color',
	component: ColorDisplay,
	tags: ['autodocs'],
	args: {
		fieldKey: 'field_name',
		value: '#FF5733',
		structure: mockStructure({ data_type: 'varchar', character_maximum_length: 255 }),
		widgetStructure: mockWidgetStructure(),
		rowData: { field_name: '#FF5733' },
		primaryKeys: [{ column_name: 'id' }],
	},
} satisfies Meta<typeof ColorDisplay>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = {
	args: { value: null },
};
