import type { Meta, StoryObj } from '@storybook/vue3-vite';
import UiAlert from './UiAlert.vue';

/**
 * Status banner, replacing 9 near-identical copies.
 *
 * Note what's missing: **margin**. The call sites sit in genuinely different layout contexts, so
 * spacing stays the caller's job via `class` passthrough. Every story below is inside a wrapper
 * that supplies its own gap, which is how a real view uses it.
 */
const meta = {
	title: 'UI/Alert',
	component: UiAlert,
	tags: ['autodocs'],
	parameters: { layout: 'padded' },
	args: { tone: 'error', live: true },
	argTypes: {
		tone: { control: 'inline-radio', options: ['error', 'success', 'info', 'warning'] },
	},
	render: (args) => ({
		components: { UiAlert },
		setup: () => ({ args }),
		template: '<UiAlert v-bind="args">We couldn\'t save your changes. Try again.</UiAlert>',
	}),
} satisfies Meta<typeof UiAlert>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The default, because every one of the 9 call sites it replaces displays a fetch error. */
// biome-ignore lint/suspicious/noShadowRestrictedNames: Storybook-facing name — it is the story's id and sidebar label, matching the `error` tone. Renaming changes a documented surface; the shadowing is confined to a module with no runtime logic.
export const Error: Story = {};

export const Success: Story = {
	args: { tone: 'success' },
	render: (args) => ({
		components: { UiAlert },
		setup: () => ({ args }),
		template: '<UiAlert v-bind="args">Your email address has been updated.</UiAlert>',
	}),
};

export const Warning: Story = {
	args: { tone: 'warning' },
	render: (args) => ({
		components: { UiAlert },
		setup: () => ({ args }),
		template: '<UiAlert v-bind="args">You\'ve used 90% of your monthly quota.</UiAlert>',
	}),
};

export const Info: Story = {
	args: { tone: 'info' },
	render: (args) => ({
		components: { UiAlert },
		setup: () => ({ args }),
		template: '<UiAlert v-bind="args">Publishing usually takes about a minute.</UiAlert>',
	}),
};

/**
 * All four tones. `error` and `warning` announce assertively (`role="alert"`); `success` and `info`
 * announce politely (`role="status"`) — an error the user just caused earns the interruption, a
 * confirmation does not.
 */
export const AllVariants: Story = {
	render: () => ({
		components: { UiAlert },
		setup: () => ({
			tones: [
				{ tone: 'error' as const, text: "We couldn't save your changes. Try again." },
				{ tone: 'warning' as const, text: "You've used 90% of your monthly quota." },
				{ tone: 'success' as const, text: 'Your email address has been updated.' },
				{ tone: 'info' as const, text: 'Publishing usually takes about a minute.' },
			],
		}),
		template: `
      <div style="display: flex; flex-direction: column; gap: 0.75rem;">
        <UiAlert v-for="t in tones" :key="t.tone" :tone="t.tone" :live="false">
          {{ t.text }}
        </UiAlert>
      </div>
    `,
	}),
};
