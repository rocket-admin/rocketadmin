import type { Meta, StoryObj } from '@storybook/vue3-vite';
import UiChip from './UiChip.vue';

/**
 * Small status pill — styled text with no interaction. Replaces the three hand-rolled `.chip`
 * blocks; the only genuine drift between them was padding, which became the `size` prop.
 *
 * Two things it deliberately does *not* do: it has no role/tabindex/click (a chip labels something
 * else, it isn't an affordance), and it does not capitalise its content — casing an arbitrary
 * status string belongs to the call site.
 */
const meta = {
	title: 'UI/Chip',
	component: UiChip,
	tags: ['autodocs'],
	args: { tone: 'neutral', size: 'sm' },
	argTypes: {
		tone: {
			control: 'inline-radio',
			options: ['neutral', 'accent', 'success', 'warning', 'danger'],
		},
		size: { control: 'inline-radio', options: ['sm', 'md'] },
	},
	render: (args) => ({
		components: { UiChip },
		setup: () => ({ args }),
		template: '<UiChip v-bind="args">published</UiChip>',
	}),
} satisfies Meta<typeof UiChip>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The majority geometry: `sm` + `neutral`, as used for the metadata chips in a website list. */
export const Default: Story = {};

/** `md` + `accent` — DashboardView's status chip, the larger of the two geometries. */
export const Status: Story = {
	args: { tone: 'accent', size: 'md' },
	render: (args) => ({
		components: { UiChip },
		setup: () => ({ args }),
		template: '<UiChip v-bind="args">generating</UiChip>',
	}),
};

/** Every tone × size. The matrix is what catches one tone drifting off the shared geometry. */
export const AllVariants: Story = {
	render: () => ({
		components: { UiChip },
		setup: () => ({
			tones: ['neutral', 'accent', 'success', 'warning', 'danger'] as const,
			sizes: ['sm', 'md'] as const,
		}),
		template: `
      <div style="display: grid; gap: 1rem;">
        <div
          v-for="size in sizes"
          :key="size"
          style="display: flex; gap: 0.75rem; align-items: center;"
        >
          <code style="width: 2rem; font-size: 0.75rem; color: var(--color-muted);">{{ size }}</code>
          <UiChip v-for="tone in tones" :key="tone" :tone="tone" :size="size">{{ tone }}</UiChip>
        </div>
      </div>
    `,
	}),
};

/** Chips are `inline-block`, so they sit on the text baseline inside a sentence or a table cell. */
export const Inline: Story = {
	render: () => ({
		components: { UiChip },
		template: `
      <p style="font-size: var(--text-base); color: var(--color-ink);">
        The site is <UiChip tone="success">published</UiChip> and served from
        <UiChip tone="neutral">demo.sitenova.pro</UiChip>.
      </p>
    `,
	}),
};
