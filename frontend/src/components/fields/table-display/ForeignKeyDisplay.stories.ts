import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { mockRelations, mockStructure, mockWidgetStructure } from '../stories.mocks';
import ForeignKeyDisplay from './ForeignKeyDisplay.vue';

const meta = {
	title: 'Table Display Fields/ForeignKey',
	component: ForeignKeyDisplay,
	tags: ['autodocs'],
	args: {
		fieldKey: 'field_name',
		value: '1',
		structure: mockStructure({ data_type: 'integer', character_maximum_length: 255 }),
		widgetStructure: mockWidgetStructure(),
		rowData: { field_name: '1' },
		primaryKeys: [{ column_name: 'id' }],
	},
} satisfies Meta<typeof ForeignKeyDisplay>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = {
	args: { value: null },
};

export const WithRelations: Story = { args: { relations: mockRelations() } };
export const Selected: Story = { args: { relations: mockRelations(), isSelected: true } };
