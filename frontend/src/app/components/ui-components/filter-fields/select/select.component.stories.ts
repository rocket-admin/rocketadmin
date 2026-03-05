import type { Meta, StoryObj } from '@storybook/angular';
import { SelectFilterComponent } from './select.component';

const mockStructure = {
	column_name: 'field_name',
	column_default: null,
	data_type: 'enum',
	isExcluded: false,
	isSearched: false,
	allow_null: true,
	auto_increment: false,
	character_maximum_length: 255,
	data_type_params: ['option1', 'option2', 'option3'],
};

const mockWidgetStructure = {
	field_name: 'field_name',
	widget_type: 'Default',
	widget_params: {},
	name: '',
	description: '',
};

const meta: Meta<SelectFilterComponent> = {
	title: 'Filter Fields/Select',
	component: SelectFilterComponent,
	args: {
		key: 'field_name',
		label: 'Field Label',
		required: false,
		readonly: false,
		disabled: false,
		structure: mockStructure as any,
		widgetStructure: mockWidgetStructure as any,
		value: 'option1',
	},
};

export default meta;
type Story = StoryObj<SelectFilterComponent>;

export const Default: Story = {};
export const Required: Story = { args: { required: true } };
export const Readonly: Story = { args: { readonly: true } };
export const Disabled: Story = { args: { disabled: true } };
