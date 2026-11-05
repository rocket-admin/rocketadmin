import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { mockStructure, mockWidgetStructure } from '../stories.mocks';
import UrlEdit from './UrlEdit.vue';

const meta = {
	title: 'Record Edit Fields/URL',
	component: UrlEdit,
	tags: ['autodocs'],
	args: {
		fieldKey: 'field_name',
		label: 'URL Field',
		required: false,
		readonly: false,
		disabled: false,
		structure: mockStructure({ data_type: 'varchar', character_maximum_length: 255 }),
		widgetStructure: mockWidgetStructure(),
		value: 'https://example.com',
	},
} satisfies Meta<typeof UrlEdit>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Required: Story = { args: { required: true } };
export const Readonly: Story = { args: { readonly: true } };
export const Disabled: Story = { args: { disabled: true } };
export const WithPrefix: Story = {
	args: { value: 'images/logo.png', widgetStructure: mockWidgetStructure({ prefix: 'https://cdn.example.com/' }) },
};
