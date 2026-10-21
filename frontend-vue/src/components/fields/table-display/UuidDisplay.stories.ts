import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { mockStructure, mockWidgetStructure } from '../stories.mocks';
import UuidDisplay from './UuidDisplay.vue';

const meta = {
	title: 'Table Display Fields/UUID',
	component: UuidDisplay,
	tags: ['autodocs'],
	args: {
		fieldKey: 'field_name',
		value: '550e8400-e29b-41d4-a716-446655440000',
		structure: mockStructure({ data_type: 'uuid', character_maximum_length: 255 }),
		widgetStructure: mockWidgetStructure(),
		rowData: { field_name: '550e8400-e29b-41d4-a716-446655440000' },
		primaryKeys: [{ column_name: 'id' }],
	},
} satisfies Meta<typeof UuidDisplay>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = {
	args: { value: null },
};
