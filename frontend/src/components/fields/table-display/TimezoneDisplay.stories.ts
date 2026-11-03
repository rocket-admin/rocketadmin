import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { mockStructure, mockWidgetStructure } from '../stories.mocks';
import TimezoneDisplay from './TimezoneDisplay.vue';

const meta = {
	title: 'Table Display Fields/Timezone',
	component: TimezoneDisplay,
	tags: ['autodocs'],
	args: {
		fieldKey: 'field_name',
		value: 'UTC',
		structure: mockStructure({ data_type: 'varchar', character_maximum_length: 255 }),
		widgetStructure: mockWidgetStructure(),
		rowData: { field_name: 'UTC' },
		primaryKeys: [{ column_name: 'id' }],
	},
} satisfies Meta<typeof TimezoneDisplay>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = {
	args: { value: null },
};
