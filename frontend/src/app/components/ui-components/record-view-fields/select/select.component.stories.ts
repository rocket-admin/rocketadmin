import type { Meta, StoryObj } from '@storybook/angular';
import { SelectRecordViewComponent } from './select.component';

const mockStructure = {
	column_name: 'field_name',
	column_default: null,
	data_type: 'enum',
	data_type_params: ['option1', 'option2', 'option3'],
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

const meta: Meta<SelectRecordViewComponent> = {
	title: 'Record View Fields/Select',
	component: SelectRecordViewComponent,
	args: {
		key: 'field_name',
		value: 'option1',
		structure: mockStructure as any,
		widgetStructure: mockWidgetStructure as any,
		rowData: { field_name: 'option1' },
		primaryKeys: { id: 1 },
	},
};

export default meta;
type Story = StoryObj<SelectRecordViewComponent>;

export const Default: Story = {};

export const Empty: Story = {
	args: { value: null },
};
