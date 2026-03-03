import type { Meta, StoryObj } from '@storybook/angular';
import { LongTextDisplayComponent } from './long-text.component';

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

const meta: Meta<LongTextDisplayComponent> = {
	title: 'Table Display Fields/LongText',
	component: LongTextDisplayComponent,
	args: {
		key: 'field_name',
		value: 'Lorem ipsum dolor sit amet...',
		structure: mockStructure as any,
		widgetStructure: mockWidgetStructure as any,
		rowData: { field_name: 'Lorem ipsum dolor sit amet...' },
		primaryKeys: [{ column_name: 'id' }],
	},
};

export default meta;
type Story = StoryObj<LongTextDisplayComponent>;

export const Default: Story = {};

export const Empty: Story = {
	args: { value: null },
};
