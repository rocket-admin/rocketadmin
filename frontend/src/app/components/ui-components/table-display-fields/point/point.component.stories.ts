import type { Meta, StoryObj } from '@storybook/angular';
import { PointDisplayComponent } from './point.component';

const mockStructure = {
	column_name: 'field_name',
	column_default: null,
	data_type: 'point',
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

const meta: Meta<PointDisplayComponent> = {
	title: 'Table Display Fields/Point',
	component: PointDisplayComponent,
	args: {
		key: 'field_name',
		value: '(40.7128, -74.0060)',
		structure: mockStructure as any,
		widgetStructure: mockWidgetStructure as any,
		rowData: { field_name: '(40.7128, -74.0060)' },
		primaryKeys: [{ column_name: 'id' }],
	},
};

export default meta;
type Story = StoryObj<PointDisplayComponent>;

export const Default: Story = {};

export const Empty: Story = {
	args: { value: null },
};
