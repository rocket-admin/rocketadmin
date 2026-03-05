import type { Meta, StoryObj } from '@storybook/angular';
import { BooleanRecordViewComponent } from './boolean.component';

const mockStructure = {
	column_name: 'field_name',
	column_default: null,
	data_type: 'boolean',
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

const meta: Meta<BooleanRecordViewComponent> = {
	title: 'Record View Fields/Boolean',
	component: BooleanRecordViewComponent,
	args: {
		key: 'field_name',
		value: true,
		structure: mockStructure as any,
		widgetStructure: mockWidgetStructure as any,
		rowData: { field_name: true },
		primaryKeys: { id: 1 },
	},
};

export default meta;
type Story = StoryObj<BooleanRecordViewComponent>;

export const Default: Story = {};

export const Empty: Story = {
	args: { value: null },
};
