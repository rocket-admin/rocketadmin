import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { mockStructure, mockWidgetStructure } from '../stories.mocks';
import S3Edit from './S3Edit.vue';

// Args-only: with no `rowPrimaryKey` the widget requests no preview URL, so nothing hits the network.
const meta = {
	title: 'Record Edit Fields/S3',
	component: S3Edit,
	tags: ['autodocs'],
	args: {
		fieldKey: 'field_name',
		label: 'S3 Field',
		required: false,
		readonly: false,
		disabled: false,
		structure: mockStructure({ data_type: 'varchar', character_maximum_length: 255 }),
		widgetStructure: mockWidgetStructure(),
		value: '',
	},
} satisfies Meta<typeof S3Edit>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Required: Story = { args: { required: true } };
export const Readonly: Story = { args: { readonly: true } };
export const Disabled: Story = { args: { disabled: true } };
