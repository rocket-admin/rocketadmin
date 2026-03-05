import type { Meta, StoryObj } from '@storybook/angular';
import { PhoneEditComponent } from './phone.component';

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

const meta: Meta<PhoneEditComponent> = {
	title: 'Record Edit Fields/Phone',
	component: PhoneEditComponent,
	args: {
		key: 'field_name',
		label: 'Phone Field',
		required: false,
		readonly: false,
		disabled: false,
		structure: mockStructure as any,
		widgetStructure: mockWidgetStructure as any,
		value: '+1234567890',
	},
};

export default meta;
type Story = StoryObj<PhoneEditComponent>;

export const Default: Story = {};
export const Required: Story = { args: { required: true } };
export const Readonly: Story = { args: { readonly: true } };
export const Disabled: Story = { args: { disabled: true } };
