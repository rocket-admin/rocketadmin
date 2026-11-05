import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { mockStructure, mockWidgetStructure } from '../stories.mocks';
import EmailFilter from './EmailFilter.vue';

const meta = {
	title: 'Filter Fields/Email',
	component: EmailFilter,
	tags: ['autodocs'],
	args: {
		fieldKey: 'field_name',
		label: 'Field Label',
		required: false,
		readonly: false,
		disabled: false,
		structure: mockStructure({ data_type: 'varchar', character_maximum_length: 255 }),
		widgetStructure: mockWidgetStructure(),
		value: 'user@example.com',
	},
} satisfies Meta<typeof EmailFilter>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Required: Story = { args: { required: true } };
export const Readonly: Story = { args: { readonly: true } };
export const Disabled: Story = { args: { disabled: true } };
export const Domain: Story = { args: { value: '@example.com' } };
