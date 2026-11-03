import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { mockStructure, mockWidgetStructure } from '../stories.mocks';
import TimezoneRecordView from './TimezoneRecordView.vue';

const meta = {
	title: 'Record View Fields/Timezone',
	component: TimezoneRecordView,
	tags: ['autodocs'],
	args: {
		fieldKey: 'field_name',
		value: 'UTC',
		structure: mockStructure({ data_type: 'varchar', character_maximum_length: 255 }),
		widgetStructure: mockWidgetStructure(),
		rowData: { field_name: 'UTC' },
		primaryKeys: { id: 1 },
	},
} satisfies Meta<typeof TimezoneRecordView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = {
	args: { value: null },
};
