import type { Meta, StoryObj } from '@storybook/vue3-vite';
import UiCard from './UiCard.vue';

/**
 * Content card, replacing `.card` ×3 and `.auth-card` ×4. The three radii those had drifted into
 * collapse onto two tokenized shapes.
 *
 * Check these on the Surface background: the card paints itself `--color-surface` too, so the
 * hairline border is the only thing separating it from the page.
 */
const meta = {
	title: 'UI/Card',
	component: UiCard,
	tags: ['autodocs'],
	parameters: { layout: 'padded' },
	args: { shape: 'panel', padding: 'md', interactive: false },
	argTypes: {
		shape: { control: 'inline-radio', options: ['panel', 'auth'] },
		padding: { control: 'inline-radio', options: ['md', 'lg', 'none'] },
	},
	render: (args) => ({
		components: { UiCard },
		setup: () => ({ args }),
		template: `
      <UiCard v-bind="args" style="max-width: 26rem;">
        <h2 style="margin: 0 0 0.5rem; font-size: var(--text-md); font-weight: var(--weight-semibold);">
          Usage this month
        </h2>
        <p style="margin: 0; color: var(--color-muted); font-size: var(--text-base);">
          You've generated 12 of 50 websites on the Free plan.
        </p>
      </UiCard>
    `,
	}),
} satisfies Meta<typeof UiCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The in-page content card: 1rem radius. */
export const Panel: Story = {};

/** The centred auth card: wider 1.5rem radius, usually with `padding="lg"`. */
export const Auth: Story = { args: { shape: 'auth', padding: 'lg' } };

/** `padding="none"` for a card owning a full-bleed child, such as a list. */
export const NoPadding: Story = {
	args: { padding: 'none' },
	render: (args) => ({
		components: { UiCard },
		setup: () => ({ args }),
		template: `
      <UiCard v-bind="args" style="max-width: 26rem;">
        <ul style="margin: 0; padding: 0; list-style: none;">
          <li
            v-for="row in ['acme.sitenova.pro', 'blog.sitenova.pro', 'docs.sitenova.pro']"
            :key="row"
            style="
              padding: 0.875rem 1.25rem;
              border-bottom: 1px solid var(--color-line);
              font-size: var(--text-base);
            "
          >
            {{ row }}
          </li>
        </ul>
      </UiCard>
    `,
	}),
};

/** Hover lift and accent border, for a card that is itself a link. Also rings on `:focus-within`. */
export const Interactive: Story = { args: { interactive: true } };

/** Both shapes × all three paddings, plus the interactive treatment. */
export const AllVariants: Story = {
	render: () => ({
		components: { UiCard },
		setup: () => ({
			combos: [
				{ shape: 'panel' as const, padding: 'md' as const, label: 'panel · md' },
				{ shape: 'panel' as const, padding: 'lg' as const, label: 'panel · lg' },
				{ shape: 'panel' as const, padding: 'none' as const, label: 'panel · none' },
				{ shape: 'auth' as const, padding: 'md' as const, label: 'auth · md' },
				{ shape: 'auth' as const, padding: 'lg' as const, label: 'auth · lg' },
				{ shape: 'auth' as const, padding: 'none' as const, label: 'auth · none' },
			],
		}),
		template: `
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(15rem, 1fr)); gap: 1.25rem;">
        <UiCard v-for="c in combos" :key="c.label" :shape="c.shape" :padding="c.padding">
          <span style="font-family: var(--font-mono); font-size: var(--text-2xs);">{{ c.label }}</span>
        </UiCard>
        <UiCard interactive>
          <span style="font-family: var(--font-mono); font-size: var(--text-2xs);">interactive</span>
        </UiCard>
      </div>
    `,
	}),
};
