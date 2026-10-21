import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { mockStructure, mockWidgetStructure } from '../stories.mocks';
import LanguageDisplay from './LanguageDisplay.vue';

const meta = {
	title: 'Table Display Fields/Language',
	component: LanguageDisplay,
	tags: ['autodocs'],
	args: {
		fieldKey: 'field_name',
		value: 'en',
		structure: mockStructure({ data_type: 'varchar', character_maximum_length: 255 }),
		widgetStructure: mockWidgetStructure(),
		rowData: { field_name: 'en' },
		primaryKeys: [{ column_name: 'id' }],
	},
} satisfies Meta<typeof LanguageDisplay>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = {
	args: { value: null },
};
