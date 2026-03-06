import type { Meta, StoryObj } from '@storybook/angular';
import { DateTimeEditComponent } from './date-time.component';

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

const meta: Meta<DateTimeEditComponent> = {
	title: 'Record Edit Fields/DateTime',
	component: DateTimeEditComponent,
	args: {
		key: 'field_name',
		label: 'DateTime Field',
		required: false,
		readonly: false,
		disabled: false,
		structure: mockStructure as any,
		widgetStructure: mockWidgetStructure as any,
		value: '2024-01-15T10:30:00',
	},
};

export default meta;
type Story = StoryObj<DateTimeEditComponent>;

export const Default: Story = {};
export const Required: Story = { args: { required: true } };
export const Readonly: Story = { args: { readonly: true } };
export const Disabled: Story = { args: { disabled: true } };
