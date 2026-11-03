import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { mockStructure, mockWidgetStructure } from '../stories.mocks';
import LongTextDisplay from './LongTextDisplay.vue';

const meta = {
	title: 'Table Display Fields/LongText',
	component: LongTextDisplay,
	tags: ['autodocs'],
	args: {
		fieldKey: 'field_name',
		value: 'Lorem ipsum dolor sit amet...',
		structure: mockStructure({ data_type: 'text', character_maximum_length: 255 }),
		widgetStructure: mockWidgetStructure(),
		rowData: { field_name: 'Lorem ipsum dolor sit amet...' },
		primaryKeys: [{ column_name: 'id' }],
	},
} satisfies Meta<typeof LongTextDisplay>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = {
	args: { value: null },
};
