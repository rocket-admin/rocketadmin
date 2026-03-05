import type { Meta, StoryObj } from '@storybook/angular';
import { PasswordDisplayComponent } from './password.component';

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

const meta: Meta<PasswordDisplayComponent> = {
	title: 'Table Display Fields/Password',
	component: PasswordDisplayComponent,
	args: {
		key: 'field_name',
		value: '********',
		structure: mockStructure as any,
		widgetStructure: mockWidgetStructure as any,
		rowData: { field_name: '********' },
		primaryKeys: [{ column_name: 'id' }],
	},
};

export default meta;
type Story = StoryObj<PasswordDisplayComponent>;

export const Default: Story = {};

export const Empty: Story = {
	args: { value: null },
};
