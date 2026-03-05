import type { Meta, StoryObj } from '@storybook/angular';
import { TimeIntervalDisplayComponent } from './time-interval.component';

const mockStructure = {
	column_name: 'field_name',
	column_default: null,
	data_type: 'interval',
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

const meta: Meta<TimeIntervalDisplayComponent> = {
	title: 'Table Display Fields/TimeInterval',
	component: TimeIntervalDisplayComponent,
	args: {
		key: 'field_name',
		value: '01:30:00',
		structure: mockStructure as any,
		widgetStructure: mockWidgetStructure as any,
		rowData: { field_name: '01:30:00' },
		primaryKeys: [{ column_name: 'id' }],
	},
};

export default meta;
type Story = StoryObj<TimeIntervalDisplayComponent>;

export const Default: Story = {};

export const Empty: Story = {
	args: { value: null },
};
