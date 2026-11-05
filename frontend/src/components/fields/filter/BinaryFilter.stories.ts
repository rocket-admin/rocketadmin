import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { mockStructure, mockWidgetStructure } from '../stories.mocks';
import BinaryFilter from './BinaryFilter.vue';

const meta = {
	title: 'Filter Fields/Binary',
	component: BinaryFilter,
	tags: ['autodocs'],
	args: {
		fieldKey: 'field_name',
		label: 'Field Label',
		required: false,
		readonly: false,
		disabled: false,
		structure: mockStructure({ data_type: 'bytea', character_maximum_length: 255 }),
		widgetStructure: mockWidgetStructure(),
		value: '48656c6c6f',
	},
} satisfies Meta<typeof BinaryFilter>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Required: Story = { args: { required: true } };
export const Readonly: Story = { args: { readonly: true } };
export const Disabled: Story = { args: { disabled: true } };
export const Base64: Story = { args: { widgetStructure: mockWidgetStructure({ encoding: 'base64' }) } };
export const Ascii: Story = { args: { widgetStructure: mockWidgetStructure({ encoding: 'ascii' }) } };
