import type { Meta, StoryObj } from '@storybook/angular';
import { IdRecordViewComponent } from './id.component';

const mockStructure = {
	column_name: 'field_name',
	column_default: null,
	data_type: 'int',
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

const meta: Meta<IdRecordViewComponent> = {
	title: 'Record View Fields/Id',
	component: IdRecordViewComponent,
	args: {
		key: 'field_name',
		value: '12345',
		structure: mockStructure as any,
		widgetStructure: mockWidgetStructure as any,
		rowData: { field_name: '12345' },
		primaryKeys: { id: 1 },
	},
};

export default meta;
type Story = StoryObj<IdRecordViewComponent>;

export const Default: Story = {};

export const Empty: Story = {
	args: { value: null },
};
