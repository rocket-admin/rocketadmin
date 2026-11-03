import type { Meta, StoryObj } from '@storybook/vue3-vite';
import UiIcon from './UiIcon.vue';

/**
 * Material Symbols Outlined ligature icon, the `mat-icon` replacement. Decorative (`aria-hidden`) by
 * default; `label` makes it `role="img"`. Colour is inherited from the surrounding text.
 */
const meta = {
	title: 'UI/Icon',
	component: UiIcon,
	tags: ['autodocs'],
	args: { name: 'database', size: 'md', filled: false },
	argTypes: { size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] } },
} satisfies Meta<typeof UiIcon>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** `label` turns it into a named image — for an icon that carries meaning with no text beside it. */
export const Meaningful: Story = { args: { name: 'warning', label: 'Warning' } };

/** Every size, outlined and filled, over the icons the app shell uses. */
export const AllVariants: Story = {
	render: () => ({
		components: { UiIcon },
		setup: () => ({
			sizes: ['sm', 'md', 'lg'] as const,
			names: ['menu', 'account_circle', 'face', 'apartment', 'key', 'electric_bolt', 'help', 'logout'],
		}),
		template: `
      <div style="display: grid; gap: 1rem;">
        <div v-for="size in sizes" :key="size" style="display: flex; gap: 1rem; align-items: center;">
          <code style="width: 4rem; font-size: 0.75rem; color: var(--color-muted);">{{ size }}</code>
          <UiIcon v-for="name in names" :key="name" :name="name" :size="size" />
          <UiIcon v-for="name in names" :key="name + '-filled'" :name="name" :size="size" filled />
        </div>
      </div>
    `,
	}),
};
