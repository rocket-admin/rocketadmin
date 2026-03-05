import type { Meta, StoryObj } from '@storybook/angular';
import { FileRecordViewComponent } from './file.component';

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

const meta: Meta<FileRecordViewComponent> = {
	title: 'Record View Fields/File',
	component: FileRecordViewComponent,
	args: {
		key: 'field_name',
		value: 'document.pdf',
		structure: mockStructure as any,
		widgetStructure: mockWidgetStructure as any,
		rowData: { field_name: 'document.pdf' },
		primaryKeys: { id: 1 },
	},
};

export default meta;
type Story = StoryObj<FileRecordViewComponent>;

export const Default: Story = {};

export const Empty: Story = {
	args: { value: null },
};
