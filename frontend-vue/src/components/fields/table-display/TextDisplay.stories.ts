import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { mockStructure, mockWidgetStructure } from '../stories.mocks';
import TextDisplay from './TextDisplay.vue';

const meta = {
	title: 'Table Display Fields/Text',
	component: TextDisplay,
	tags: ['autodocs'],
	args: {
		fieldKey: 'field_name',
		value: 'Sample text',
		structure: mockStructure({ data_type: 'varchar', character_maximum_length: 255 }),
		widgetStructure: mockWidgetStructure(),
		rowData: { field_name: 'Sample text' },
		primaryKeys: [{ column_name: 'id' }],
	},
} satisfies Meta<typeof TextDisplay>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = {
	args: { value: null },
};

export const Invalid: Story = {
	args: { value: 'not-an-email', widgetStructure: mockWidgetStructure({ validate: 'isEmail' }) },
};
