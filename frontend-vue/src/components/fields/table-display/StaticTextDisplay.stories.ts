import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { mockStructure, mockWidgetStructure } from '../stories.mocks';
import StaticTextDisplay from './StaticTextDisplay.vue';

const meta = {
	title: 'Table Display Fields/StaticText',
	component: StaticTextDisplay,
	tags: ['autodocs'],
	args: {
		fieldKey: 'field_name',
		value: 'Static content',
		structure: mockStructure({ data_type: 'varchar', character_maximum_length: 255 }),
		widgetStructure: mockWidgetStructure(),
		rowData: { field_name: 'Static content' },
		primaryKeys: [{ column_name: 'id' }],
	},
} satisfies Meta<typeof StaticTextDisplay>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = {
	args: { value: null },
};
