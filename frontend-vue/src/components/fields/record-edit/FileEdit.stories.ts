import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { mockStructure, mockWidgetStructure } from '../stories.mocks';
import FileEdit from './FileEdit.vue';

const meta = {
	title: 'Record Edit Fields/File',
	component: FileEdit,
	tags: ['autodocs'],
	args: {
		fieldKey: 'field_name',
		label: 'File Field',
		required: false,
		readonly: false,
		disabled: false,
		structure: mockStructure({ data_type: 'bytea', character_maximum_length: 255 }),
		widgetStructure: mockWidgetStructure(),
		value: '',
	},
} satisfies Meta<typeof FileEdit>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Required: Story = { args: { required: true } };
export const Readonly: Story = { args: { readonly: true } };
export const Disabled: Story = { args: { disabled: true } };
