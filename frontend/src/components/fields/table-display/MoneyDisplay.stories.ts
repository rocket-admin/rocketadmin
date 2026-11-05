import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { mockStructure, mockWidgetStructure } from '../stories.mocks';
import MoneyDisplay from './MoneyDisplay.vue';

const meta = {
	title: 'Table Display Fields/Money',
	component: MoneyDisplay,
	tags: ['autodocs'],
	args: {
		fieldKey: 'field_name',
		value: '$99.99',
		structure: mockStructure({ data_type: 'numeric', character_maximum_length: 255 }),
		widgetStructure: mockWidgetStructure(),
		rowData: { field_name: '$99.99' },
		primaryKeys: [{ column_name: 'id' }],
	},
} satisfies Meta<typeof MoneyDisplay>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = {
	args: { value: null },
};

export const WithCurrency: Story = {
	args: { value: 1099, widgetStructure: mockWidgetStructure({ default_currency: 'USD', cents: true }) },
};
