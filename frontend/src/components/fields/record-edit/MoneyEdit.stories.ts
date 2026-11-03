import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { mockStructure, mockWidgetStructure } from '../stories.mocks';
import MoneyEdit from './MoneyEdit.vue';

const meta = {
	title: 'Record Edit Fields/Money',
	component: MoneyEdit,
	tags: ['autodocs'],
	args: {
		fieldKey: 'field_name',
		label: 'Money Field',
		required: false,
		readonly: false,
		disabled: false,
		structure: mockStructure({ data_type: 'money', character_maximum_length: 255 }),
		widgetStructure: mockWidgetStructure(),
		value: '99.99',
	},
} satisfies Meta<typeof MoneyEdit>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Required: Story = { args: { required: true } };
export const Readonly: Story = { args: { readonly: true } };
export const Disabled: Story = { args: { disabled: true } };
export const WithCurrencySelector: Story = {
	args: {
		value: { amount: 1099, currency: 'EUR' },
		widgetStructure: mockWidgetStructure({ show_currency_selector: true, cents: true }),
	},
};
