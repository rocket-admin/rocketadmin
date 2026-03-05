import type { Meta, StoryObj } from '@storybook/angular';
import { ImageDisplayComponent } from './image.component';

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

const meta: Meta<ImageDisplayComponent> = {
	title: 'Table Display Fields/Image',
	component: ImageDisplayComponent,
	args: {
		key: 'field_name',
		value: 'https://via.placeholder.com/150',
		structure: mockStructure as any,
		widgetStructure: mockWidgetStructure as any,
		rowData: { field_name: 'https://via.placeholder.com/150' },
		primaryKeys: [{ column_name: 'id' }],
	},
};

export default meta;
type Story = StoryObj<ImageDisplayComponent>;

export const Default: Story = {};

export const Empty: Story = {
	args: { value: null },
};
