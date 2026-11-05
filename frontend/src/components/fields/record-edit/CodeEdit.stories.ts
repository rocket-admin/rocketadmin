import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { mockStructure, mockWidgetStructure } from '../stories.mocks';
import CodeEdit from './CodeEdit.vue';

const meta = {
	title: 'Record Edit Fields/Code',
	component: CodeEdit,
	tags: ['autodocs'],
	args: {
		fieldKey: 'field_name',
		label: 'Code Field',
		required: false,
		readonly: false,
		disabled: false,
		structure: mockStructure({ data_type: 'text', character_maximum_length: 255 }),
		widgetStructure: mockWidgetStructure({ language: 'javascript' }),
		value: 'console.log("hello")',
	},
} satisfies Meta<typeof CodeEdit>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Required: Story = { args: { required: true } };
export const Readonly: Story = { args: { readonly: true } };
export const Disabled: Story = { args: { disabled: true } };
