import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { mockStructure, mockWidgetStructure } from '../stories.mocks';
import FileDisplay from './FileDisplay.vue';

const meta = {
	title: 'Table Display Fields/File',
	component: FileDisplay,
	tags: ['autodocs'],
	args: {
		fieldKey: 'field_name',
		value: 'document.pdf',
		structure: mockStructure({ data_type: 'varchar', character_maximum_length: 255 }),
		widgetStructure: mockWidgetStructure(),
		rowData: { field_name: 'document.pdf' },
		primaryKeys: [{ column_name: 'id' }],
	},
} satisfies Meta<typeof FileDisplay>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = {
	args: { value: null },
};
