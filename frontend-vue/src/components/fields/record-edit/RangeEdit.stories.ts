import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { mockStructure, mockWidgetStructure } from '../stories.mocks';
import RangeEdit from './RangeEdit.vue';

const meta = {
	title: 'Record Edit Fields/Range',
	component: RangeEdit,
	tags: ['autodocs'],
	args: {
		fieldKey: 'field_name',
		label: 'Range Field',
		required: false,
		readonly: false,
		disabled: false,
		structure: mockStructure({ data_type: 'int', character_maximum_length: 255 }),
		widgetStructure: mockWidgetStructure(),
		value: 50,
	},
} satisfies Meta<typeof RangeEdit>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Required: Story = { args: { required: true } };
export const Readonly: Story = { args: { readonly: true } };
export const Disabled: Story = { args: { disabled: true } };
