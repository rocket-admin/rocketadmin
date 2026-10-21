import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { mockStructure, mockWidgetStructure } from '../stories.mocks';
import PointEdit from './PointEdit.vue';

// The Angular story passed the string '(40.7128, -74.0060)', which rendered empty inputs; the
// column actually arrives as `{ x, y }`.
const meta = {
	title: 'Record Edit Fields/Point',
	component: PointEdit,
	tags: ['autodocs'],
	args: {
		fieldKey: 'field_name',
		label: 'Point Field',
		required: false,
		readonly: false,
		disabled: false,
		structure: mockStructure({ data_type: 'point', character_maximum_length: 255 }),
		widgetStructure: mockWidgetStructure(),
		value: { x: 40.7128, y: -74.006 },
	},
} satisfies Meta<typeof PointEdit>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Required: Story = { args: { required: true } };
export const Readonly: Story = { args: { readonly: true } };
export const Disabled: Story = { args: { disabled: true } };
