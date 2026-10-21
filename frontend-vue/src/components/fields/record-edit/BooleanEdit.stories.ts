import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { mockStructure, mockWidgetStructure } from '../stories.mocks';
import BooleanEdit from './BooleanEdit.vue';

const meta = {
	title: 'Record Edit Fields/Boolean',
	component: BooleanEdit,
	tags: ['autodocs'],
	args: {
		fieldKey: 'field_name',
		label: 'Boolean Field',
		required: false,
		readonly: false,
		disabled: false,
		structure: mockStructure({ data_type: 'boolean', character_maximum_length: 255 }),
		widgetStructure: mockWidgetStructure(),
		value: true,
	},
} satisfies Meta<typeof BooleanEdit>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Required: Story = { args: { required: true } };
export const Readonly: Story = { args: { readonly: true } };
export const Disabled: Story = { args: { disabled: true } };
