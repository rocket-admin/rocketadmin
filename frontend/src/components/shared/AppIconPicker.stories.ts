import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { ref } from 'vue';
import AppIconPicker from './AppIconPicker.vue';

/** Icon chooser for table and action settings (port of Angular's `app-icon-picker`). */
const meta = {
	title: 'App/IconPicker',
	component: AppIconPicker,
	tags: ['autodocs'],
	parameters: { layout: 'padded' },
	args: {
		defaultIcons: [
			'star',
			'favorite',
			'bolt',
			'mail',
			'send',
			'check_circle',
			'delete',
			'edit',
			'person',
			'shopping_cart',
		],
		tooltip: 'Choose an icon',
		resetButtonShown: true,
	},
	render: (args) => ({
		components: { AppIconPicker },
		setup: () => ({ args, icon: ref<string | null>(null) }),
		template: `
      <div style="min-height: 22rem;">
        <AppIconPicker v-bind="args" :icon="icon" @change="icon = $event" />
        <p style="color: var(--color-muted);">Current: {{ icon ?? 'none' }}</p>
      </div>
    `,
	}),
} satisfies Meta<typeof AppIconPicker>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
