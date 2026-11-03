import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { mockStructure, mockWidgetStructure } from '../stories.mocks';
import PhoneFilter from './PhoneFilter.vue';

const meta = {
	title: 'Filter Fields/Phone',
	component: PhoneFilter,
	tags: ['autodocs'],
	args: {
		fieldKey: 'field_name',
		label: 'Field Label',
		required: false,
		readonly: false,
		disabled: false,
		structure: mockStructure({ data_type: 'varchar', character_maximum_length: 255 }),
		widgetStructure: mockWidgetStructure(),
		value: '+15551234567',
	},
} satisfies Meta<typeof PhoneFilter>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Required: Story = { args: { required: true } };
export const Readonly: Story = { args: { readonly: true } };
export const Disabled: Story = { args: { disabled: true } };
export const CountryCode: Story = { args: { value: '+49' } };
