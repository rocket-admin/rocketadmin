import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { mockStructure, mockWidgetStructure } from '../stories.mocks';
import MarkdownDisplay from './MarkdownDisplay.vue';

const meta = {
	title: 'Table Display Fields/Markdown',
	component: MarkdownDisplay,
	tags: ['autodocs'],
	args: {
		fieldKey: 'field_name',
		value: '# Hello',
		structure: mockStructure({ data_type: 'text', character_maximum_length: 255 }),
		widgetStructure: mockWidgetStructure(),
		rowData: { field_name: '# Hello' },
		primaryKeys: [{ column_name: 'id' }],
	},
} satisfies Meta<typeof MarkdownDisplay>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = {
	args: { value: null },
};
