import type { Meta, StoryObj } from '@storybook/angular';
import { DateTimeRecordViewComponent } from './date-time.component';

const mockStructure = {
	column_name: 'field_name',
	column_default: null,
	data_type: 'datetime',
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

const meta: Meta<DateTimeRecordViewComponent> = {
	title: 'Record View Fields/DateTime',
	component: DateTimeRecordViewComponent,
	args: {
		key: 'field_name',
		value: '2024-01-15T10:30:00',
		structure: mockStructure as any,
		widgetStructure: mockWidgetStructure as any,
		rowData: { field_name: '2024-01-15T10:30:00' },
		primaryKeys: { id: 1 },
	},
};

export default meta;
type Story = StoryObj<DateTimeRecordViewComponent>;

export const Default: Story = {};

export const Empty: Story = {
	args: { value: null },
};
