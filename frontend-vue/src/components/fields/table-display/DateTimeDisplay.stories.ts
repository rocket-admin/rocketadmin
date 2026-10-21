import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { mockStructure, mockWidgetStructure } from '../stories.mocks';
import DateTimeDisplay from './DateTimeDisplay.vue';

const meta = {
	title: 'Table Display Fields/DateTime',
	component: DateTimeDisplay,
	tags: ['autodocs'],
	args: {
		fieldKey: 'field_name',
		value: '2024-01-15T10:30:00',
		structure: mockStructure({ data_type: 'datetime', character_maximum_length: 255 }),
		widgetStructure: mockWidgetStructure(),
		rowData: { field_name: '2024-01-15T10:30:00' },
		primaryKeys: [{ column_name: 'id' }],
	},
} satisfies Meta<typeof DateTimeDisplay>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = {
	args: { value: null },
};
