import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { mockStructure, mockWidgetStructure } from '../stories.mocks';
import PhoneRecordView from './PhoneRecordView.vue';

const meta = {
	title: 'Record View Fields/Phone',
	component: PhoneRecordView,
	tags: ['autodocs'],
	args: {
		fieldKey: 'field_name',
		value: '+1 (555) 123-4567',
		structure: mockStructure({ data_type: 'varchar', character_maximum_length: 255 }),
		widgetStructure: mockWidgetStructure(),
		rowData: { field_name: '+1 (555) 123-4567' },
		primaryKeys: { id: 1 },
	},
} satisfies Meta<typeof PhoneRecordView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = {
	args: { value: null },
};

export const International: Story = { args: { value: '+442071838750' } };
