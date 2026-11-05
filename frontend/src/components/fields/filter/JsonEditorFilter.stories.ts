import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { mockStructure, mockWidgetStructure } from '../stories.mocks';
import JsonEditorFilter from './JsonEditorFilter.vue';

const meta = {
	title: 'Filter Fields/JsonEditor',
	component: JsonEditorFilter,
	tags: ['autodocs'],
	args: {
		fieldKey: 'field_name',
		label: 'Field Label',
		required: false,
		readonly: false,
		disabled: false,
		structure: mockStructure({ data_type: 'json', character_maximum_length: 255 }),
		widgetStructure: mockWidgetStructure(),
		value: { key: 'value' },
	},
} satisfies Meta<typeof JsonEditorFilter>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Required: Story = { args: { required: true } };
export const Readonly: Story = { args: { readonly: true } };
export const Disabled: Story = { args: { disabled: true } };
