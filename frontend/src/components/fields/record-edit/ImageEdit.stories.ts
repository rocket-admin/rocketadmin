import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { mockStructure, mockWidgetStructure } from '../stories.mocks';
import ImageEdit from './ImageEdit.vue';

const meta = {
	title: 'Record Edit Fields/Image',
	component: ImageEdit,
	tags: ['autodocs'],
	args: {
		fieldKey: 'field_name',
		label: 'Image Field',
		required: false,
		readonly: false,
		disabled: false,
		structure: mockStructure({ data_type: 'varchar', character_maximum_length: 255 }),
		widgetStructure: mockWidgetStructure(),
		value: 'https://via.placeholder.com/150',
	},
} satisfies Meta<typeof ImageEdit>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Required: Story = { args: { required: true } };
export const Readonly: Story = { args: { readonly: true } };
export const Disabled: Story = { args: { disabled: true } };
