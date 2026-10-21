import type { Meta, StoryObj } from '@storybook/vue3-vite';
import UiButton from './UiButton.vue';
import UiSpinner from './UiSpinner.vue';

/**
 * The single spin animation, owning the `@keyframes spin` that was copy-pasted into two views.
 *
 * It lands in Phase 3 ahead of the other status primitives because `UiButton`'s `loading` state
 * mounts it. The ring inherits `currentColor`, which is why it needs no per-variant styling inside
 * a button.
 *
 * Toggle the OS "reduce motion" setting to check the guard in `base.css`: the ring should stop
 * rather than spin.
 */
const meta = {
	title: 'UI/Spinner',
	component: UiSpinner,
	tags: ['autodocs'],
	args: { size: 'md' },
	argTypes: { size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] } },
} satisfies Meta<typeof UiSpinner>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Unlabelled, so `aria-hidden` — the in-button case, where the button announces instead. */
export const Default: Story = {};

/** Labelled, so `role="status"` with a visually-hidden name — for a standalone page spinner. */
export const Labelled: Story = { args: { label: 'Loading websites' } };

/** Inside a button, where it inherits the label colour on every variant. */
export const InsideAButton: Story = {
	render: () => ({
		components: { UiButton },
		template: `
      <div style="display: flex; gap: 1rem; align-items: center;">
        <UiButton loading>Publishing</UiButton>
        <UiButton variant="secondary" loading>Publishing</UiButton>
        <UiButton variant="ghost" size="sm" loading>Publishing</UiButton>
      </div>
    `,
	}),
};

/** Every size, standalone and in-button, on the current colour. */
export const AllVariants: Story = {
	render: () => ({
		components: { UiSpinner, UiButton },
		template: `
      <div style="display: flex; gap: 2rem; align-items: center; color: var(--color-ink);">
        <UiSpinner size="sm" />
        <UiSpinner size="md" />
        <UiSpinner size="lg" />
        <span style="color: var(--color-accent);"><UiSpinner size="md" /></span>
        <UiButton size="sm" loading>Small</UiButton>
        <UiButton size="md" loading>Medium</UiButton>
        <UiButton size="lg" loading>Large</UiButton>
      </div>
    `,
	}),
};
