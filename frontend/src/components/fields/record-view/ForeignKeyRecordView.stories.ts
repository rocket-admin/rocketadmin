import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { mockStructure, mockWidgetStructure } from '../stories.mocks';
import ForeignKeyRecordView from './ForeignKeyRecordView.vue';

const meta = {
	title: 'Record View Fields/ForeignKey',
	component: ForeignKeyRecordView,
	tags: ['autodocs'],
	args: {
		fieldKey: 'field_name',
		value: '1',
		structure: mockStructure({ data_type: 'int', character_maximum_length: 255 }),
		widgetStructure: mockWidgetStructure(),
		rowData: { field_name: '1' },
		primaryKeys: { id: 1 },
		link: '/dashboard/connection_id/customers/entry',
		primaryKeysParams: { id: 1 },
		displayValue: 'Ada Lovelace',
	},
} satisfies Meta<typeof ForeignKeyRecordView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = {
	args: { value: null, displayValue: null },
};
