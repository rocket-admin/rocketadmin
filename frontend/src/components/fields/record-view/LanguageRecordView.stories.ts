import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { mockStructure, mockWidgetStructure } from '../stories.mocks';
import LanguageRecordView from './LanguageRecordView.vue';

const meta = {
	title: 'Record View Fields/Language',
	component: LanguageRecordView,
	tags: ['autodocs'],
	args: {
		fieldKey: 'field_name',
		value: 'en',
		structure: mockStructure({ data_type: 'varchar', character_maximum_length: 255 }),
		widgetStructure: mockWidgetStructure(),
		rowData: { field_name: 'en' },
		primaryKeys: { id: 1 },
	},
} satisfies Meta<typeof LanguageRecordView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = {
	args: { value: null },
};
