import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { mockStructure, mockWidgetStructure } from '../stories.mocks';
import RangeDisplay from './RangeDisplay.vue';

const meta = {
	title: 'Table Display Fields/Range',
	component: RangeDisplay,
	tags: ['autodocs'],
	args: {
		fieldKey: 'field_name',
		value: 50,
		structure: mockStructure({ data_type: 'integer', character_maximum_length: 255 }),
		widgetStructure: mockWidgetStructure(),
		rowData: { field_name: 50 },
		primaryKeys: [{ column_name: 'id' }],
	},
} satisfies Meta<typeof RangeDisplay>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = {
	args: { value: null },
};
