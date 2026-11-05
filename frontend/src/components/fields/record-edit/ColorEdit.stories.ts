import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { mockStructure, mockWidgetStructure } from '../stories.mocks';
import ColorEdit from './ColorEdit.vue';

const meta = {
	title: 'Record Edit Fields/Color',
	component: ColorEdit,
	tags: ['autodocs'],
	args: {
		fieldKey: 'field_name',
		label: 'Color Field',
		required: false,
		readonly: false,
		disabled: false,
		structure: mockStructure({ data_type: 'varchar', character_maximum_length: 255 }),
		widgetStructure: mockWidgetStructure(),
		value: '#FF5733',
	},
} satisfies Meta<typeof ColorEdit>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Required: Story = { args: { required: true } };
export const Readonly: Story = { args: { readonly: true } };
export const Disabled: Story = { args: { disabled: true } };
