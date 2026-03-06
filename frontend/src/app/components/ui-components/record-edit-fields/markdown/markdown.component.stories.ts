import type { Meta, StoryObj } from '@storybook/angular';
import { MarkdownEditComponent } from './markdown.component';

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
	widget_params: {},
	name: '',
	description: '',
};

const meta: Meta<MarkdownEditComponent> = {
	title: 'Record Edit Fields/Markdown',
	component: MarkdownEditComponent,
	args: {
		key: 'field_name',
		label: 'Markdown Field',
		required: false,
		readonly: false,
		disabled: false,
		structure: mockStructure as any,
		widgetStructure: mockWidgetStructure as any,
		value: '# Hello\nThis is **markdown** content with a [link](https://example.com).',
	},
};

export default meta;
type Story = StoryObj<MarkdownEditComponent>;

export const Default: Story = {};
export const Required: Story = { args: { required: true } };
export const Readonly: Story = { args: { readonly: true } };
export const Disabled: Story = { args: { disabled: true } };
