import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { mockStructure, mockWidgetStructure } from '../stories.mocks';
import PasswordRecordView from './PasswordRecordView.vue';

const meta = {
	title: 'Record View Fields/Password',
	component: PasswordRecordView,
	tags: ['autodocs'],
	args: {
		fieldKey: 'field_name',
		value: '********',
		structure: mockStructure({ data_type: 'varchar', character_maximum_length: 255 }),
		widgetStructure: mockWidgetStructure(),
		rowData: { field_name: '********' },
		primaryKeys: { id: 1 },
	},
} satisfies Meta<typeof PasswordRecordView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = {
	args: { value: null },
};
