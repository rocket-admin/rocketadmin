import type { Meta, StoryObj } from '@storybook/angular';
import { UrlRecordViewComponent } from './url.component';

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

const meta: Meta<UrlRecordViewComponent> = {
	title: 'Record View Fields/Url',
	component: UrlRecordViewComponent,
	args: {
		key: 'field_name',
		value: 'https://example.com',
		structure: mockStructure as any,
		widgetStructure: mockWidgetStructure as any,
		rowData: { field_name: 'https://example.com' },
		primaryKeys: { id: 1 },
	},
};

export default meta;
type Story = StoryObj<UrlRecordViewComponent>;

export const Default: Story = {};

export const Empty: Story = {
	args: { value: null },
};
