import type { Meta, StoryObj } from '@storybook/angular';
import { JsonEditorDisplayComponent } from './json-editor.component';

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

const meta: Meta<JsonEditorDisplayComponent> = {
	title: 'Table Display Fields/JsonEditor',
	component: JsonEditorDisplayComponent,
	args: {
		key: 'field_name',
		value: '{"key": "value"}',
		structure: mockStructure as any,
		widgetStructure: mockWidgetStructure as any,
		rowData: { field_name: '{"key": "value"}' },
		primaryKeys: [{ column_name: 'id' }],
	},
};

export default meta;
type Story = StoryObj<JsonEditorDisplayComponent>;

export const Default: Story = {};

export const Empty: Story = {
	args: { value: null },
};
