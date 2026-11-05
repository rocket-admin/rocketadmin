import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { mockStructure, mockWidgetStructure } from '../stories.mocks';
import JsonEditorEdit from './JsonEditorEdit.vue';

const meta = {
	title: 'Record Edit Fields/JsonEditor',
	component: JsonEditorEdit,
	tags: ['autodocs'],
	args: {
		fieldKey: 'field_name',
		label: 'JSON Editor Field',
		required: false,
		readonly: false,
		disabled: false,
		structure: mockStructure({ data_type: 'json', character_maximum_length: 255 }),
		widgetStructure: mockWidgetStructure(),
		value: { key: 'value', nested: { a: 1 } },
	},
} satisfies Meta<typeof JsonEditorEdit>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Required: Story = { args: { required: true } };
export const Readonly: Story = { args: { readonly: true } };
export const Disabled: Story = { args: { disabled: true } };
