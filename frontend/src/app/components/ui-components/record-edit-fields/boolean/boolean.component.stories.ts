import type { Meta, StoryObj } from '@storybook/angular';
import { BooleanEditComponent } from './boolean.component';

const mockStructure = {
	column_name: 'field_name',
	column_default: null,
	data_type: 'boolean',
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

const meta: Meta<BooleanEditComponent> = {
	title: 'Record Edit Fields/Boolean',
	component: BooleanEditComponent,
	args: {
		key: 'field_name',
		label: 'Boolean Field',
		required: false,
		readonly: false,
		disabled: false,
		structure: mockStructure as any,
		widgetStructure: mockWidgetStructure as any,
		value: true,
	},
};

export default meta;
type Story = StoryObj<BooleanEditComponent>;

export const Default: Story = {};
export const Required: Story = { args: { required: true } };
export const Readonly: Story = { args: { readonly: true } };
export const Disabled: Story = { args: { disabled: true } };
