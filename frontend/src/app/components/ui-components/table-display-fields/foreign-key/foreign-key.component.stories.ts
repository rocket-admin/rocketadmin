import type { Meta, StoryObj } from '@storybook/angular';
import { ForeignKeyDisplayComponent } from './foreign-key.component';

const mockStructure = {
	column_name: 'field_name',
	column_default: null,
	data_type: 'integer',
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

const meta: Meta<ForeignKeyDisplayComponent> = {
	title: 'Table Display Fields/ForeignKey',
	component: ForeignKeyDisplayComponent,
	args: {
		key: 'field_name',
		value: '1',
		structure: mockStructure as any,
		widgetStructure: mockWidgetStructure as any,
		rowData: { field_name: '1' },
		primaryKeys: [{ column_name: 'id' }],
	},
};

export default meta;
type Story = StoryObj<ForeignKeyDisplayComponent>;

export const Default: Story = {};

export const Empty: Story = {
	args: { value: null },
};
