import type { Meta, StoryObj } from '@storybook/angular';
import { MoneyDisplayComponent } from './money.component';

const mockStructure = {
	column_name: 'field_name',
	column_default: null,
	data_type: 'numeric',
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

const meta: Meta<MoneyDisplayComponent> = {
	title: 'Table Display Fields/Money',
	component: MoneyDisplayComponent,
	args: {
		key: 'field_name',
		value: '$99.99',
		structure: mockStructure as any,
		widgetStructure: mockWidgetStructure as any,
		rowData: { field_name: '$99.99' },
		primaryKeys: [{ column_name: 'id' }],
	},
};

export default meta;
type Story = StoryObj<MoneyDisplayComponent>;

export const Default: Story = {};

export const Empty: Story = {
	args: { value: null },
};
