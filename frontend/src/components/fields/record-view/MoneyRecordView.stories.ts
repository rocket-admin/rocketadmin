import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { mockStructure, mockWidgetStructure } from '../stories.mocks';
import MoneyRecordView from './MoneyRecordView.vue';

const meta = {
	title: 'Record View Fields/Money',
	component: MoneyRecordView,
	tags: ['autodocs'],
	args: {
		fieldKey: 'field_name',
		value: '$99.99',
		structure: mockStructure({ data_type: 'decimal', character_maximum_length: 255 }),
		widgetStructure: mockWidgetStructure(),
		rowData: { field_name: '$99.99' },
		primaryKeys: { id: 1 },
	},
} satisfies Meta<typeof MoneyRecordView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = {
	args: { value: null },
};

export const WithCurrency: Story = {
	args: { value: 2599, widgetStructure: mockWidgetStructure({ default_currency: 'USD', cents: true }) },
};
