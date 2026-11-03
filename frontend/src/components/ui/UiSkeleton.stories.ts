import type { Meta, StoryObj } from '@storybook/vue3-vite';
import UiSkeleton from './UiSkeleton.vue';

/**
 * Loading placeholder, owning the `@keyframes shimmer` that was copy-pasted into four views.
 *
 * The radius drift between those copies became the `shape` prop instead of being arbitrated: a text
 * line wants a pill, a 3rem content block wants panel radius. `width`/`height` pass through as
 * inline styles — the one accepted `:style` in a primitive, because the call sites need percentages
 * of an arbitrary container.
 *
 * The wrapper is a single `role="status"` region with the bars `aria-hidden`, so a three-line
 * skeleton announces "Loading" once. Toggle the OS "reduce motion" setting to check `base.css`'s
 * guard: the shimmer should stop.
 */
const meta = {
	title: 'UI/Skeleton',
	component: UiSkeleton,
	tags: ['autodocs'],
	parameters: { layout: 'padded' },
	args: { shape: 'line', lines: 1 },
	argTypes: {
		shape: { control: 'inline-radio', options: ['line', 'block'] },
		lines: { control: { type: 'number', min: 1, max: 6 } },
	},
} satisfies Meta<typeof UiSkeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A single text line at the default height. */
export const Default: Story = {};

/**
 * The real shape of a card skeleton in WebsitesView: a short title over a longer body line.
 *
 * Two separate bars means two `role="status"` regions, so this is the case where a view should
 * reach for `lines` — or give the wrapper the specific label and accept the second generic one.
 */
export const CardPlaceholder: Story = {
	render: () => ({
		components: { UiSkeleton },
		template: `
      <div style="display: grid; gap: 0.75rem; max-width: 22rem;">
        <UiSkeleton label="Loading websites" width="40%" height="1.1rem" />
        <UiSkeleton width="75%" height="0.85rem" />
      </div>
    `,
	}),
};

/** `lines: 3` — three bars inside one labelled wrapper, so AT announces "Loading" once. */
export const MultipleLines: Story = { args: { lines: 3, width: '75%' } };

/** `shape: 'block'` — WebsiteDetailView's 3rem area, which wants panel radius, not a pill. */
export const Block: Story = { args: { shape: 'block', height: '3rem' } };

/** Both shapes, alone and stacked. The matrix is what catches a radius regressing to one value. */
export const AllVariants: Story = {
	render: () => ({
		components: { UiSkeleton },
		template: `
      <div style="display: grid; gap: 1.5rem; max-width: 26rem;">
        <div>
          <code style="font-size: 0.75rem; color: var(--color-muted);">line · 1</code>
          <UiSkeleton width="40%" height="1.1rem" />
        </div>
        <div>
          <code style="font-size: 0.75rem; color: var(--color-muted);">line · 3</code>
          <UiSkeleton :lines="3" width="75%" height="0.85rem" />
        </div>
        <div>
          <code style="font-size: 0.75rem; color: var(--color-muted);">block · 1</code>
          <UiSkeleton shape="block" height="3rem" />
        </div>
        <div>
          <code style="font-size: 0.75rem; color: var(--color-muted);">block · 2</code>
          <UiSkeleton shape="block" :lines="2" height="3rem" />
        </div>
      </div>
    `,
	}),
};
