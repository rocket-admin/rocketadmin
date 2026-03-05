import type { Meta, StoryObj } from '@storybook/angular';
import { UuidDisplayComponent } from './uuid.component';

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

const meta: Meta<UuidDisplayComponent> = {
	title: 'Table Display Fields/UUID',
	component: UuidDisplayComponent,
	args: {
		key: 'field_name',
		value: '550e8400-e29b-41d4-a716-446655440000',
		structure: mockStructure as any,
		widgetStructure: mockWidgetStructure as any,
		rowData: { field_name: '550e8400-e29b-41d4-a716-446655440000' },
		primaryKeys: [{ column_name: 'id' }],
	},
};

export default meta;
type Story = StoryObj<UuidDisplayComponent>;

export const Default: Story = {};

export const Empty: Story = {
	args: { value: null },
};
