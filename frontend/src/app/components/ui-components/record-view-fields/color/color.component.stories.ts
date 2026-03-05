import type { Meta, StoryObj } from '@storybook/angular';
import { ColorRecordViewComponent } from './color.component';

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

const meta: Meta<ColorRecordViewComponent> = {
	title: 'Record View Fields/Color',
	component: ColorRecordViewComponent,
	args: {
		key: 'field_name',
		value: '#FF5733',
		structure: mockStructure as any,
		widgetStructure: mockWidgetStructure as any,
		rowData: { field_name: '#FF5733' },
		primaryKeys: { id: 1 },
	},
};

export default meta;
type Story = StoryObj<ColorRecordViewComponent>;

export const Default: Story = {};

export const Empty: Story = {
	args: { value: null },
};
