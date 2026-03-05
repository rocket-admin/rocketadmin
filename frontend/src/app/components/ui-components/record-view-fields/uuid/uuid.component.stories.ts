import type { Meta, StoryObj } from '@storybook/angular';
import { UuidRecordViewComponent } from './uuid.component';

const mockStructure = {
	column_name: 'field_name',
	column_default: null,
	data_type: 'uuid',
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

const meta: Meta<UuidRecordViewComponent> = {
	title: 'Record View Fields/Uuid',
	component: UuidRecordViewComponent,
	args: {
		key: 'field_name',
		value: '550e8400-e29b-41d4-a716-446655440000',
		structure: mockStructure as any,
		widgetStructure: mockWidgetStructure as any,
		rowData: { field_name: '550e8400-e29b-41d4-a716-446655440000' },
		primaryKeys: { id: 1 },
	},
};

export default meta;
type Story = StoryObj<UuidRecordViewComponent>;

export const Default: Story = {};

export const Empty: Story = {
	args: { value: null },
};
