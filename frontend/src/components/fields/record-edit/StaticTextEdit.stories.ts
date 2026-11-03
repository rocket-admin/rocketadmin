import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { mockStructure, mockWidgetStructure } from '../stories.mocks';
import StaticTextEdit from './StaticTextEdit.vue';

const meta = {
	title: 'Record Edit Fields/StaticText',
	component: StaticTextEdit,
	tags: ['autodocs'],
	args: {
		fieldKey: 'field_name',
		label: 'Static Text Field',
		required: false,
		readonly: false,
		disabled: false,
		structure: mockStructure({ data_type: 'varchar', character_maximum_length: 255 }),
		widgetStructure: mockWidgetStructure(),
		value: 'This is static text content',
	},
} satisfies Meta<typeof StaticTextEdit>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Required: Story = { args: { required: true } };
export const Readonly: Story = { args: { readonly: true } };
export const Disabled: Story = { args: { disabled: true } };
