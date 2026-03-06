import type { Meta, StoryObj } from '@storybook/angular';
import { BinaryDataCaptionDisplayComponent } from './binary-data-caption.component';

const mockStructure = {
	column_name: 'field_name',
	column_default: null,
	data_type: 'bytea',
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

const meta: Meta<BinaryDataCaptionDisplayComponent> = {
	title: 'Table Display Fields/BinaryDataCaption',
	component: BinaryDataCaptionDisplayComponent,
	args: {
		key: 'field_name',
		value: '(binary data)',
		structure: mockStructure as any,
		widgetStructure: mockWidgetStructure as any,
		rowData: { field_name: '(binary data)' },
		primaryKeys: [{ column_name: 'id' }],
	},
};

export default meta;
type Story = StoryObj<BinaryDataCaptionDisplayComponent>;

export const Default: Story = {};

export const Empty: Story = {
	args: { value: null },
};
