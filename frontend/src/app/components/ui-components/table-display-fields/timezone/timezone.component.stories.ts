import type { Meta, StoryObj } from '@storybook/angular';
import { TimezoneDisplayComponent } from './timezone.component';

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

const meta: Meta<TimezoneDisplayComponent> = {
	title: 'Table Display Fields/Timezone',
	component: TimezoneDisplayComponent,
	args: {
		key: 'field_name',
		value: 'UTC',
		structure: mockStructure as any,
		widgetStructure: mockWidgetStructure as any,
		rowData: { field_name: 'UTC' },
		primaryKeys: [{ column_name: 'id' }],
	},
};

export default meta;
type Story = StoryObj<TimezoneDisplayComponent>;

export const Default: Story = {};

export const Empty: Story = {
	args: { value: null },
};
