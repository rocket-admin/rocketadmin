import type { Meta, StoryObj } from '@storybook/angular';
import { MoneyRecordViewComponent } from './money.component';

const mockStructure = {
	column_name: 'field_name',
	column_default: null,
	data_type: 'decimal',
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

const meta: Meta<MoneyRecordViewComponent> = {
	title: 'Record View Fields/Money',
	component: MoneyRecordViewComponent,
	args: {
		key: 'field_name',
		value: '$99.99',
		structure: mockStructure as any,
		widgetStructure: mockWidgetStructure as any,
		rowData: { field_name: '$99.99' },
		primaryKeys: { id: 1 },
	},
};

export default meta;
type Story = StoryObj<MoneyRecordViewComponent>;

export const Default: Story = {};

export const Empty: Story = {
	args: { value: null },
};
