import type { Meta, StoryObj } from '@storybook/angular';
import { CodeRecordViewComponent } from './code.component';

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

const meta: Meta<CodeRecordViewComponent> = {
	title: 'Record View Fields/Code',
	component: CodeRecordViewComponent,
	args: {
		key: 'field_name',
		value: 'console.log("hello")',
		structure: mockStructure as any,
		widgetStructure: mockWidgetStructure as any,
		rowData: { field_name: 'console.log("hello")' },
		primaryKeys: { id: 1 },
	},
};

export default meta;
type Story = StoryObj<CodeRecordViewComponent>;

export const Default: Story = {};

export const Empty: Story = {
	args: { value: null },
};
