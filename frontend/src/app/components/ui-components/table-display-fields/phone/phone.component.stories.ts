import type { Meta, StoryObj } from '@storybook/angular';
import { PhoneDisplayComponent } from './phone.component';

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

const meta: Meta<PhoneDisplayComponent> = {
	title: 'Table Display Fields/Phone',
	component: PhoneDisplayComponent,
	args: {
		key: 'field_name',
		value: '+1 (555) 123-4567',
		structure: mockStructure as any,
		widgetStructure: mockWidgetStructure as any,
		rowData: { field_name: '+1 (555) 123-4567' },
		primaryKeys: [{ column_name: 'id' }],
	},
};

export default meta;
type Story = StoryObj<PhoneDisplayComponent>;

export const Default: Story = {};

export const Empty: Story = {
	args: { value: null },
};
