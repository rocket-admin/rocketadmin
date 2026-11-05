import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { mockStructure, mockWidgetStructure } from '../stories.mocks';
import TextEdit from './TextEdit.vue';

const meta = {
	title: 'Record Edit Fields/Text',
	component: TextEdit,
	tags: ['autodocs'],
	args: {
		fieldKey: 'field_name',
		label: 'Text Field',
		required: false,
		readonly: false,
		disabled: false,
		structure: mockStructure({ data_type: 'varchar', character_maximum_length: 255 }),
		widgetStructure: mockWidgetStructure(),
		value: 'Sample text value',
	},
} satisfies Meta<typeof TextEdit>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Required: Story = { args: { required: true } };
export const Readonly: Story = { args: { readonly: true } };
export const Disabled: Story = { args: { disabled: true } };
export const WithValidation: Story = {
	args: { value: 'not-an-email', widgetStructure: mockWidgetStructure({ validate: 'isEmail' }) },
};
