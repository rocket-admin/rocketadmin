import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { mockStructure, mockWidgetStructure } from '../stories.mocks';
import PhoneDisplay from './PhoneDisplay.vue';

const meta = {
	title: 'Table Display Fields/Phone',
	component: PhoneDisplay,
	tags: ['autodocs'],
	args: {
		fieldKey: 'field_name',
		value: '+1 (555) 123-4567',
		structure: mockStructure({ data_type: 'varchar', character_maximum_length: 255 }),
		widgetStructure: mockWidgetStructure(),
		rowData: { field_name: '+1 (555) 123-4567' },
		primaryKeys: [{ column_name: 'id' }],
	},
} satisfies Meta<typeof PhoneDisplay>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = {
	args: { value: null },
};
