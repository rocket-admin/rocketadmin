import type { Meta, StoryObj } from '@storybook/vue3-vite';
import UiProgressBar from './UiProgressBar.vue';

/**
 * Determinate meter, replacing AccountView's usage bar and the app's only inline style.
 *
 * The value it adds over two divs is arithmetic and ARIA: it clamps out-of-range values, refuses to
 * render `NaN%` when `max` is zero, and emits `role="progressbar"` with real `aria-valuenow`/`max` —
 * the meter it replaces is invisible to assistive tech today.
 *
 * `tone` is the caller's decision. "Warn at 80%" is product policy that differs per meter, so the
 * primitive never derives a tone from a threshold.
 */
const meta = {
	title: 'UI/ProgressBar',
	component: UiProgressBar,
	tags: ['autodocs'],
	parameters: { layout: 'padded' },
	args: { value: 40, max: 100, label: 'Daily generation budget', tone: 'accent' },
	argTypes: {
		tone: { control: 'inline-radio', options: ['accent', 'warning', 'danger'] },
		value: { control: { type: 'number' } },
	},
	decorators: [() => ({ template: '<div style="max-width: 22rem;"><story /></div>' })],
} satisfies Meta<typeof UiProgressBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** The real AccountView shape: a label/value row above the bar, in the caller's own markup. */
export const UsageMeter: Story = {
	args: { value: 7, max: 10, label: 'Websites generated today' },
	render: (args) => ({
		components: { UiProgressBar },
		setup: () => ({ args }),
		template: `
      <div style="display: grid; gap: 0.5rem;">
        <div style="display: flex; justify-content: space-between; font-size: var(--text-sm); color: var(--color-ink-soft);">
          <span>Websites generated today</span>
          <span>{{ args.value }} / {{ args.max }}</span>
        </div>
        <UiProgressBar v-bind="args" />
      </div>
    `,
	}),
};

/** Near quota — the caller chose `warning`; the bar did not decide that for itself. */
export const NearQuota: Story = { args: { value: 85, tone: 'warning' } };

/** At quota. `value` above `max` clamps to a full bar rather than overflowing the track. */
export const OverQuota: Story = { args: { value: 120, tone: 'danger' } };

/**
 * The edge cases the spec pins down, rendered. `max: 0` is the one AccountView guarded at the call
 * site — the primitive owns it now, so it shows an empty track instead of `NaN%`.
 */
export const EdgeCases: Story = {
	render: () => ({
		components: { UiProgressBar },
		setup: () => ({
			cases: [
				{ label: 'Empty', value: 0, max: 100, tone: 'accent' as const },
				{ label: 'Negative value clamps to 0%', value: -20, max: 100, tone: 'accent' as const },
				{ label: 'Value above max clamps to 100%', value: 150, max: 100, tone: 'danger' as const },
				{ label: 'Zero max renders empty, not NaN%', value: 5, max: 0, tone: 'warning' as const },
			],
		}),
		template: `
      <div style="display: grid; gap: 1rem;">
        <div v-for="c in cases" :key="c.label" style="display: grid; gap: 0.375rem;">
          <span style="font-size: var(--text-xs); color: var(--color-muted);">{{ c.label }}</span>
          <UiProgressBar :value="c.value" :max="c.max" :tone="c.tone" :label="c.label" />
        </div>
      </div>
    `,
	}),
};

/** All three tones at the same fill, so a drifted track or radius shows up immediately. */
export const AllVariants: Story = {
	render: () => ({
		components: { UiProgressBar },
		setup: () => ({ tones: ['accent', 'warning', 'danger'] as const }),
		template: `
      <div style="display: grid; gap: 1rem;">
        <div v-for="tone in tones" :key="tone" style="display: grid; gap: 0.375rem;">
          <code style="font-size: 0.75rem; color: var(--color-muted);">{{ tone }}</code>
          <UiProgressBar :value="65" :tone="tone" :label="tone + ' meter'" />
        </div>
      </div>
    `,
	}),
};
