import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { mockStructure, mockWidgetStructure } from '../stories.mocks';
import NumberEdit from './NumberEdit.vue';

const meta = {
	title: 'Record Edit Fields/Number',
	component: NumberEdit,
	tags: ['autodocs'],
	args: {
		fieldKey: 'field_name',
		label: 'Number Field',
		required: false,
		readonly: false,
		disabled: false,
		structure: mockStructure({ data_type: 'int', character_maximum_length: 255 }),
		widgetStructure: mockWidgetStructure(),
		value: 42,
	},
} satisfies Meta<typeof NumberEdit>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Required: Story = { args: { required: true } };
export const Readonly: Story = { args: { readonly: true } };
export const Disabled: Story = { args: { disabled: true } };
