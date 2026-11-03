import type { Meta, StoryObj } from '@storybook/vue3-vite';
import UiButton from './UiButton.vue';

/**
 * The one button, replacing ~19 hand-rolled blocks. `AllVariants` is the story that matters — it's
 * what catches primary and secondary drifting apart, which is exactly how the pre-DS code ended up
 * with five different `.btn` geometries.
 *
 * Review it on all three background options: `secondary` and `ghost` both paint themselves
 * `--color-surface`, so Ink is where a missing border shows up.
 */
const meta = {
	title: 'UI/Button',
	component: UiButton,
	tags: ['autodocs'],
	args: {
		variant: 'primary',
		size: 'md',
		disabled: false,
		loading: false,
		block: false,
	},
	argTypes: {
		variant: { control: 'select', options: ['primary', 'secondary', 'ghost', 'danger'] },
		size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
		to: { control: false },
		href: { control: false },
	},
	render: (args) => ({
		components: { UiButton },
		setup: () => ({ args }),
		template: '<UiButton v-bind="args">Create website</UiButton>',
	}),
} satisfies Meta<typeof UiButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {};

export const Secondary: Story = { args: { variant: 'secondary' } };

/** The recessive action next to a primary — quieter hover, no accent lift. */
export const Ghost: Story = { args: { variant: 'ghost' } };

/** Destructive actions. Its focus ring is `--ring-danger`, not the accent one. */
export const Danger: Story = { args: { variant: 'danger' } };

/**
 * `loading` implies `disabled` and swaps the leading slot for a spinner, so the button can't fire
 * twice and its width doesn't jump when the request starts.
 */
export const Loading: Story = { args: { loading: true } };

export const Disabled: Story = { args: { disabled: true } };

/** `block` replaces the four `.submit { width: 100% }` copies. */
export const Block: Story = {
	args: { block: true },
	parameters: { layout: 'padded' },
};

/** Adornments use `leading`/`trailing` — logical positions, never `left`/`right`. */
export const WithAdornments: Story = {
	render: () => ({
		components: { UiButton },
		template: `
      <div style="display: flex; gap: 1rem; align-items: center;">
        <UiButton variant="secondary">
          <template #leading><span aria-hidden="true">✦</span></template>
          Generate
        </UiButton>
        <UiButton variant="ghost">
          Open site
          <template #trailing><span aria-hidden="true">↗</span></template>
        </UiButton>
      </div>
    `,
	}),
};

/**
 * A disabled link renders as a `<span role="link" aria-disabled="true">` with **no** `href` — so
 * it leaves the tab order and can't be opened in a new tab, which `pointer-events: none` alone
 * would not prevent.
 */
export const AsLink: Story = {
	render: () => ({
		components: { UiButton },
		template: `
      <div style="display: flex; gap: 1rem; align-items: center;">
        <UiButton to="/account" variant="secondary">Router link</UiButton>
        <UiButton href="https://example.com" variant="ghost">External anchor</UiButton>
        <UiButton href="https://example.com" variant="ghost" disabled>Disabled link</UiButton>
      </div>
    `,
	}),
};

/**
 * Every variant × size. Scan the columns for consistent vertical rhythm and the rows for
 * consistent weight — this is the drift detector.
 */
export const AllVariants: Story = {
	parameters: { layout: 'padded' },
	render: () => ({
		components: { UiButton },
		setup: () => ({
			variants: ['primary', 'secondary', 'ghost', 'danger'] as const,
			sizes: ['sm', 'md', 'lg'] as const,
		}),
		template: `
      <table style="border-collapse: collapse;">
        <thead>
          <tr>
            <th style="text-align: left; padding: 0.5rem 1rem 0.5rem 0; font-size: 0.8125rem;"></th>
            <th
              v-for="size in sizes"
              :key="size"
              style="text-align: left; padding: 0.5rem 1rem; font-size: 0.8125rem;"
            >
              {{ size }}
            </th>
            <th style="text-align: left; padding: 0.5rem 1rem; font-size: 0.8125rem;">disabled</th>
            <th style="text-align: left; padding: 0.5rem 1rem; font-size: 0.8125rem;">loading</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="variant in variants" :key="variant">
            <th
              scope="row"
              style="text-align: left; padding: 0.5rem 1rem 0.5rem 0; font-size: 0.8125rem;"
            >
              {{ variant }}
            </th>
            <td v-for="size in sizes" :key="size" style="padding: 0.5rem 1rem;">
              <UiButton :variant="variant" :size="size">Action</UiButton>
            </td>
            <td style="padding: 0.5rem 1rem;">
              <UiButton :variant="variant" disabled>Action</UiButton>
            </td>
            <td style="padding: 0.5rem 1rem;">
              <UiButton :variant="variant" loading>Action</UiButton>
            </td>
          </tr>
        </tbody>
      </table>
    `,
	}),
};
