import type { Meta, StoryObj } from '@storybook/angular';
import { JsonEditorRecordViewComponent } from './json-editor.component';

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

const meta: Meta<JsonEditorRecordViewComponent> = {
	title: 'Record View Fields/JsonEditor',
	component: JsonEditorRecordViewComponent,
	args: {
		key: 'field_name',
		value: '{"key": "value"}',
		structure: mockStructure as any,
		widgetStructure: mockWidgetStructure as any,
		rowData: { field_name: '{"key": "value"}' },
		primaryKeys: { id: 1 },
	},
};

export default meta;
type Story = StoryObj<JsonEditorRecordViewComponent>;

export const Default: Story = {};

export const Empty: Story = {
	args: { value: null },
};
