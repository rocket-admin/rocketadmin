import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { mockStructure, mockWidgetStructure } from '../stories.mocks';
import BinaryDataCaptionEdit from './BinaryDataCaptionEdit.vue';

const meta = {
	title: 'Record Edit Fields/BinaryDataCaption',
	component: BinaryDataCaptionEdit,
	tags: ['autodocs'],
	args: {
		fieldKey: 'field_name',
		label: 'Binary Data Caption Field',
		required: false,
		readonly: false,
		disabled: false,
		structure: mockStructure({ data_type: 'bytea', character_maximum_length: 255 }),
		widgetStructure: mockWidgetStructure(),
	},
} satisfies Meta<typeof BinaryDataCaptionEdit>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Required: Story = { args: { required: true } };
export const Readonly: Story = { args: { readonly: true } };
export const Disabled: Story = { args: { disabled: true } };
