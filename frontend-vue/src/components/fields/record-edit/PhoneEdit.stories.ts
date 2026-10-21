import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { mockStructure, mockWidgetStructure } from '../stories.mocks';
import PhoneEdit from './PhoneEdit.vue';

const meta = {
	title: 'Record Edit Fields/Phone',
	component: PhoneEdit,
	tags: ['autodocs'],
	args: {
		fieldKey: 'field_name',
		label: 'Phone Field',
		required: false,
		readonly: false,
		disabled: false,
		structure: mockStructure({ data_type: 'varchar', character_maximum_length: 255 }),
		widgetStructure: mockWidgetStructure(),
		value: '+1234567890',
	},
} satisfies Meta<typeof PhoneEdit>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Required: Story = { args: { required: true } };
export const Readonly: Story = { args: { readonly: true } };
export const Disabled: Story = { args: { disabled: true } };
export const ValidNumber: Story = { args: { value: '+442079460958' } };
