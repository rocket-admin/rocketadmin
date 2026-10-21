import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { mockStructure, mockWidgetStructure } from '../stories.mocks';
import PasswordDisplay from './PasswordDisplay.vue';

const meta = {
	title: 'Table Display Fields/Password',
	component: PasswordDisplay,
	tags: ['autodocs'],
	args: {
		fieldKey: 'field_name',
		value: '********',
		structure: mockStructure({ data_type: 'varchar', character_maximum_length: 255 }),
		widgetStructure: mockWidgetStructure(),
		rowData: { field_name: '********' },
		primaryKeys: [{ column_name: 'id' }],
	},
} satisfies Meta<typeof PasswordDisplay>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = {
	args: { value: null },
};
