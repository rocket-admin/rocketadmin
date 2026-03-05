import type { Meta, StoryObj } from '@storybook/angular';
import { CodeEditComponent } from './code.component';

const mockStructure = {
	column_name: 'field_name',
	column_default: null,
	data_type: 'text',
	isExcluded: false,
	isSearched: false,
	allow_null: true,
	auto_increment: false,
	character_maximum_length: 255,
};

const mockWidgetStructure = {
	field_name: 'field_name',
	widget_type: 'Default',
	widget_params: { language: 'javascript' },
	name: '',
	description: '',
};

const meta: Meta<CodeEditComponent> = {
	title: 'Record Edit Fields/Code',
	component: CodeEditComponent,
	args: {
		key: 'field_name',
		label: 'Code Field',
		required: false,
		readonly: false,
		disabled: false,
		structure: mockStructure as any,
		widgetStructure: mockWidgetStructure as any,
		value: 'console.log("hello")',
	},
};

export default meta;
type Story = StoryObj<CodeEditComponent>;

export const Default: Story = {};
export const Required: Story = { args: { required: true } };
export const Readonly: Story = { args: { readonly: true } };
export const Disabled: Story = { args: { disabled: true } };
