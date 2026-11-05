import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { mockStructure, mockWidgetStructure } from '../stories.mocks';
import UuidEdit from './UuidEdit.vue';

const meta = {
	title: 'Record Edit Fields/UUID',
	component: UuidEdit,
	tags: ['autodocs'],
	args: {
		fieldKey: 'field_name',
		label: 'UUID Field',
		required: false,
		readonly: false,
		disabled: false,
		structure: mockStructure({ data_type: 'uuid', character_maximum_length: 255 }),
		widgetStructure: mockWidgetStructure(),
		value: '550e8400-e29b-41d4-a716-446655440000',
	},
} satisfies Meta<typeof UuidEdit>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Required: Story = { args: { required: true } };
export const Readonly: Story = { args: { readonly: true } };
export const Disabled: Story = { args: { disabled: true } };
export const NameBasedV5: Story = {
	args: { value: '', widgetStructure: mockWidgetStructure({ version: 'v5', name: 'rocketadmin.com' }) },
};
