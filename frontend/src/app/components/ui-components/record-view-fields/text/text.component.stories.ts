import type { Meta, StoryObj } from '@storybook/angular';
import { TextRecordViewComponent } from './text.component';

const mockStructure = {
	column_name: 'field_name',
	column_default: null,
	data_type: 'varchar',
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

const meta: Meta<TextRecordViewComponent> = {
	title: 'Record View Fields/Text',
	component: TextRecordViewComponent,
	args: {
		key: 'field_name',
		value: 'Sample text',
		structure: mockStructure as any,
		widgetStructure: mockWidgetStructure as any,
		rowData: { field_name: 'Sample text' },
		primaryKeys: { id: 1 },
	},
};

export default meta;
type Story = StoryObj<TextRecordViewComponent>;

export const Default: Story = {};

export const Empty: Story = {
	args: { value: null },
};
