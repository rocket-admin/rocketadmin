import type { Meta, StoryObj } from '@storybook/vue3-vite';
import UiBadge from './UiBadge.vue';
import UiIcon from './UiIcon.vue';

/**
 * Count/dot overlay, the `matBadge` replacement — the "1" on the account icon while the email is
 * unverified. The indicator is `aria-hidden`; `label` says what it means to a screenreader.
 */
const meta = {
	title: 'UI/Badge',
	component: UiBadge,
	tags: ['autodocs'],
	args: { content: 1, hidden: false, tone: 'accent', max: 99 },
	argTypes: { tone: { control: 'inline-radio', options: ['accent', 'danger', 'neutral'] } },
	render: (args) => ({
		components: { UiBadge, UiIcon },
		setup: () => ({ args }),
		template: '<UiBadge v-bind="args" label="Email not verified"><UiIcon name="account_circle" /></UiBadge>',
	}),
} satisfies Meta<typeof UiBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Dot: Story = { args: { content: undefined } };

export const Hidden: Story = { args: { hidden: true } };

/** Every tone × dot / count / capped count, overlaid and inline. */
export const AllVariants: Story = {
	render: () => ({
		components: { UiBadge, UiIcon },
		setup: () => ({ tones: ['accent', 'danger', 'neutral'] as const }),
		template: `
      <div style="display: grid; gap: 1.5rem;">
        <div v-for="tone in tones" :key="tone" style="display: flex; gap: 2rem; align-items: center;">
          <code style="width: 4rem; font-size: 0.75rem; color: var(--color-muted);">{{ tone }}</code>
          <UiBadge :tone="tone"><UiIcon name="face" /></UiBadge>
          <UiBadge :tone="tone" :content="1"><UiIcon name="face" /></UiBadge>
          <UiBadge :tone="tone" :content="250"><UiIcon name="notifications" /></UiBadge>
          <span>Inline <UiBadge :tone="tone" :content="12" /></span>
        </div>
      </div>
    `,
	}),
};
