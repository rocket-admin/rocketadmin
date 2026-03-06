import type { Meta, StoryObj } from '@storybook/angular';
import { JsonEditorEditComponent } from './json-editor.component';

const mockStructure = {
	column_name: 'field_name',
	column_default: null,
	data_type: 'json',
	isExcluded: false,
	isSearched: false,
	allow_null: true,
	auto_increment: false,
	character_maximum_length: 255,
};

const mockWidgetStructure = {
	field_name: 'field_name',
	widget_type: 'Default',
	widget_params: {},
	name: '',
	description: '',
};

const meta: Meta<JsonEditorEditComponent> = {
	title: 'Record Edit Fields/JsonEditor',
	component: JsonEditorEditComponent,
	args: {
		key: 'field_name',
		label: 'JSON Editor Field',
		required: false,
		readonly: false,
		disabled: false,
		structure: mockStructure as any,
		widgetStructure: mockWidgetStructure as any,
		value: { key: 'value', nested: { a: 1 } },
	},
};

export default meta;
type Story = StoryObj<JsonEditorEditComponent>;

export const Default: Story = {};
export const Required: Story = { args: { required: true } };
export const Readonly: Story = { args: { readonly: true } };
export const Disabled: Story = { args: { disabled: true } };
