import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { mockStructure, mockWidgetStructure } from '../stories.mocks';
import TimeIntervalDisplay from './TimeIntervalDisplay.vue';

const meta = {
	title: 'Table Display Fields/TimeInterval',
	component: TimeIntervalDisplay,
	tags: ['autodocs'],
	args: {
		fieldKey: 'field_name',
		value: '01:30:00',
		structure: mockStructure({ data_type: 'interval', character_maximum_length: 255 }),
		widgetStructure: mockWidgetStructure(),
		rowData: { field_name: '01:30:00' },
		primaryKeys: [{ column_name: 'id' }],
	},
} satisfies Meta<typeof TimeIntervalDisplay>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = {
	args: { value: null },
};
