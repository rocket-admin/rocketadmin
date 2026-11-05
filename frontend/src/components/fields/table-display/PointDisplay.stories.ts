import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { mockStructure, mockWidgetStructure } from '../stories.mocks';
import PointDisplay from './PointDisplay.vue';

const meta = {
	title: 'Table Display Fields/Point',
	component: PointDisplay,
	tags: ['autodocs'],
	args: {
		fieldKey: 'field_name',
		value: '(40.7128, -74.0060)',
		structure: mockStructure({ data_type: 'point', character_maximum_length: 255 }),
		widgetStructure: mockWidgetStructure(),
		rowData: { field_name: '(40.7128, -74.0060)' },
		primaryKeys: [{ column_name: 'id' }],
	},
} satisfies Meta<typeof PointDisplay>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = {
	args: { value: null },
};
