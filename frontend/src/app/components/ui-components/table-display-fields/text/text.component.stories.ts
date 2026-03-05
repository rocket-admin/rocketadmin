import type { Meta, StoryObj } from '@storybook/angular';
import { TextDisplayComponent } from './text.component';

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

const meta: Meta<TextDisplayComponent> = {
	title: 'Table Display Fields/Text',
	component: TextDisplayComponent,
	args: {
		key: 'field_name',
		value: 'Sample text',
		structure: mockStructure as any,
		widgetStructure: mockWidgetStructure as any,
		rowData: { field_name: 'Sample text' },
		primaryKeys: [{ column_name: 'id' }],
	},
};

export default meta;
type Story = StoryObj<TextDisplayComponent>;

export const Default: Story = {};

export const Empty: Story = {
	args: { value: null },
};
