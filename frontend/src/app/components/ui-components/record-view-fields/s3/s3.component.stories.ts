import type { Meta, StoryObj } from '@storybook/angular';
import { S3RecordViewComponent } from './s3.component';

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

const meta: Meta<S3RecordViewComponent> = {
	title: 'Record View Fields/S3',
	component: S3RecordViewComponent,
	args: {
		key: 'field_name',
		value: 's3://bucket/file.txt',
		structure: mockStructure as any,
		widgetStructure: mockWidgetStructure as any,
		rowData: { field_name: 's3://bucket/file.txt' },
		primaryKeys: { id: 1 },
	},
};

export default meta;
type Story = StoryObj<S3RecordViewComponent>;

export const Default: Story = {};

export const Empty: Story = {
	args: { value: null },
};
