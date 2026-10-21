import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { mockStructure, mockWidgetStructure } from '../stories.mocks';
import LanguageEdit from './LanguageEdit.vue';

const meta = {
	title: 'Record Edit Fields/Language',
	component: LanguageEdit,
	tags: ['autodocs'],
	args: {
		fieldKey: 'field_name',
		label: 'Language Field',
		required: false,
		readonly: false,
		disabled: false,
		structure: mockStructure({ data_type: 'varchar', character_maximum_length: 255 }),
		widgetStructure: mockWidgetStructure(),
		value: 'en',
	},
} satisfies Meta<typeof LanguageEdit>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Required: Story = { args: { required: true } };
export const Readonly: Story = { args: { readonly: true } };
export const Disabled: Story = { args: { disabled: true } };
