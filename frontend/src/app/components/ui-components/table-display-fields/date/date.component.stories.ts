import type { Meta, StoryObj } from '@storybook/angular';
import { DateDisplayComponent } from './date.component';

const mockStructure = {
	column_name: 'field_name',
	column_default: null,
	data_type: 'date',
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

const meta: Meta<DateDisplayComponent> = {
	title: 'Table Display Fields/Date',
	component: DateDisplayComponent,
	args: {
		key: 'field_name',
		value: '2024-01-15',
		structure: mockStructure as any,
		widgetStructure: mockWidgetStructure as any,
		rowData: { field_name: '2024-01-15' },
		primaryKeys: [{ column_name: 'id' }],
	},
};

export default meta;
type Story = StoryObj<DateDisplayComponent>;

export const Default: Story = {};

export const Empty: Story = {
	args: { value: null },
};
